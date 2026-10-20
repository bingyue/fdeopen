import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink, readFile } from 'node:fs/promises';
import path from 'node:path';
import { db } from './db';
import { AppError } from './validation';
import { audit } from './service';
import { mediaRole, publicMedia } from './media-service';
import type { User } from './types';
export const MAX_UPLOAD = 10 * 1024 * 1024;
export function detectUpload(bytes: Uint8Array) {
  const b = Buffer.from(bytes);
  if (b.length < 12) throw new AppError('文件内容不完整');
  if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return { mime: 'image/png', ext: 'png' };
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) return { mime: 'image/jpeg', ext: 'jpg' };
  if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP')
    return { mime: 'image/webp', ext: 'webp' };
  if (b.subarray(0, 5).toString() === '%PDF-') return { mime: 'application/pdf', ext: 'pdf' };
  throw new AppError('仅支持 PNG、JPEG、WebP 图片与 PDF，不支持 SVG 或可执行文件');
}
function uploadDirectory() {
  const configured = process.env.MEDIA_UPLOAD_DIR || '.data/uploads';
  return path.resolve(/* turbopackIgnore: true */ configured);
}
export async function readUpload(request: Request) {
  if (Number(request.headers.get('content-length') || 0) > MAX_UPLOAD)
    throw new AppError('附件不能超过10 MB', 413);
  if (!request.body) throw new AppError('请选择附件');
  const reader = request.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_UPLOAD) {
        await reader.cancel();
        throw new AppError('附件不能超过10 MB', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, size);
}
export async function saveAsset(
  user: User,
  bytes: Uint8Array,
  filename: string,
  claimedMime: string,
) {
  const database = await db();
  if (!(await mediaRole(user, database))) throw new AppError('上传需要媒体编辑权限', 403);
  if (!bytes.length || bytes.length > MAX_UPLOAD) throw new AppError('附件大小不符合要求', 413);
  const { mime, ext } = detectUpload(bytes);
  if (mime !== claimedMime) throw new AppError('文件声明类型与实际内容不一致');
  const id = randomUUID(),
    key = `${id}.${ext}`,
    directory = uploadDirectory();
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(/* turbopackIgnore: true */ directory, key), bytes, {
    flag: 'wx',
    mode: 0o600,
  });
  try {
    await database.transaction(async (tx) => {
      await tx.query(
        'INSERT INTO media_assets(id,owner_id,filename,mime,size,storage_key) VALUES($1,$2,$3,$4,$5,$6)',
        [
          id,
          user.id,
          filename.replace(/[\r\n/\\]/g, '_').slice(0, 160) || key,
          mime,
          bytes.length,
          key,
        ],
      );
      await audit(tx, user.id, 'media.upload', id, { mime, size: bytes.length });
    });
  } catch (error) {
    await unlink(path.join(/* turbopackIgnore: true */ directory, key)).catch(() => {});
    throw error;
  }
  return { id, url: `/api/media/assets/${id}`, mime };
}
export async function assetResponse(id: string, user: User | null) {
  const database = await db();
  const [asset] = await database.query<{
    owner_id: string;
    mime: string;
    storage_key: string;
    size: number;
  }>('SELECT owner_id,mime,storage_key,size FROM media_assets WHERE id=$1', [id]);
  if (!asset) throw new AppError('附件不存在', 404);
  const role = await mediaRole(user, database);
  let allowed = role && (role !== 'author' || asset.owner_id === user?.id);
  if (!allowed && asset.mime.startsWith('image/'))
    allowed =
      (
        await database.query(
          `SELECT p.id FROM media_posts p WHERE ${publicMedia} AND (p.cover_id=$1 OR p.body LIKE $2) LIMIT 1`,
          [id, `%/api/media/assets/${id}%`],
        )
      ).length > 0;
  if (!allowed && asset.mime === 'application/pdf')
    allowed =
      (
        await database.query(
          `SELECT p.id FROM media_posts p WHERE ${publicMedia} AND p.report_id=$1 AND (p.download_access='public' OR (p.download_access='request' AND EXISTS(SELECT 1 FROM media_inquiries i WHERE i.post_id=p.id AND i.kind='report' AND i.user_id=$2 AND i.status='completed'))) LIMIT 1`,
          [id, user?.id || null],
        )
      ).length > 0;
  if (!allowed) throw new AppError('此附件需要授权', 403);
  if (!/^[a-f0-9-]{36}\.(png|jpg|webp|pdf)$/.test(asset.storage_key))
    throw new AppError('附件无效', 404);
  let bytes: Buffer;
  try {
    bytes = await readFile(
      path.join(/* turbopackIgnore: true */ uploadDirectory(), asset.storage_key),
    );
  } catch {
    throw new AppError('附件暂不可用，请联系编辑', 404);
  }
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': asset.mime,
      'Content-Length': String(bytes.length),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Content-Disposition': `${asset.mime === 'application/pdf' ? 'attachment' : 'inline'}; filename="${asset.storage_key}"`,
    },
  });
}
