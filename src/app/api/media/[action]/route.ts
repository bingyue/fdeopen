import { z } from 'zod';
import { currentUser, requireUser } from '@/lib/auth';
import { checkOrigin, readJson, errorResponse, requestKey } from '@/lib/http';
import { rateLimit } from '@/lib/service';
import { AppError } from '@/lib/validation';
import * as media from '@/lib/media-service';
import { readUpload, saveAsset } from '@/lib/media-assets';

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    checkOrigin(request);
    const { action } = await params,
      key = requestKey(request);
    await rateLimit(`media-http:${key}`, 100, 60);
    if (action === 'upload') {
      const user = await requireUser();
      if (!(await media.mediaRole(user))) throw new AppError('上传需要媒体编辑权限', 403);
      await rateLimit(`media-upload:${user.id}`, 30, 3600);
      const filename = decodeURIComponent(request.headers.get('x-filename') || 'file');
      return Response.json(
        await saveAsset(
          user,
          await readUpload(request),
          filename,
          request.headers.get('content-type') || '',
        ),
      );
    }
    const data = await readJson(request, action === 'save' ? 1024 * 1024 : 128000);
    if (action === 'inquiry') {
      await rateLimit(`media-inquiry:${key}`, 8, 3600);
      return Response.json(await media.submitInquiry(await currentUser(), data));
    }
    if (action === 'subscribe') {
      await rateLimit(`media-subscribe:${key}`, 5, 3600);
      return Response.json(await media.subscribe(data));
    }
    if (action === 'unsubscribe') {
      await media.unsubscribe(data);
      return Response.json({ ok: true });
    }
    if (action === 'view') {
      await media.recordMediaView(z.uuid().parse(data.id), key);
      return Response.json({ ok: true });
    }
    const user = await requireUser();
    switch (action) {
      case 'save':
        return Response.json(await media.savePost(user, data));
      case 'delete': {
        const v = z.object({ id: z.uuid(), revision: z.number().int().positive() }).parse(data);
        await media.deletePost(user, v.id, v.revision);
        break;
      }
      case 'taxonomy':
        await media.saveTaxonomy(user, data);
        break;
      case 'role':
        await media.grantMediaRole(user, data);
        break;
      case 'home':
        await media.saveHomeOrder(user, data);
        break;
      case 'inquiry-status':
        await media.updateInquiry(user, data);
        break;
      default:
        throw new AppError('接口不存在', 404);
    }
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
