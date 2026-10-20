import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { AppError } from './validation';

const prefix = 'scrypt$32768$8$1';
const dummy = `${prefix}$${'0'.repeat(32)}$${'0'.repeat(64)}`;
let activeHashes = 0;

async function derive(password: string, salt: string) {
  // Bound work and memory even when many different source addresses attempt logins.
  if (activeHashes >= 4) throw new AppError('登录请求较多，请稍后重试', 503);
  activeHashes += 1;
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      scrypt(
        password,
        Buffer.from(salt, 'hex'),
        32,
        { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
        (error, key) => {
          if (error) reject(error);
          else resolve(key);
        },
      );
    });
  } finally {
    activeHashes -= 1;
  }
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt);
  return `${prefix}$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored?: string) {
  const valid = !!stored && /^scrypt\$32768\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(stored);
  const parts = (valid ? stored! : dummy).split('$');
  const key = await derive(password, parts[4]);
  return timingSafeEqual(key, Buffer.from(parts[5], 'hex')) && valid;
}
