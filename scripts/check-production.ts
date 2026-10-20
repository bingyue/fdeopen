import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { assertConfig, isDemo } from '../src/lib/config';

if (process.env.NODE_ENV !== 'production' || isDemo()) {
  throw new Error('The public service requires production mode with real authentication.');
}
assertConfig();
const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL!);
if (
  origin.protocol !== 'https:' ||
  origin.username ||
  origin.password ||
  origin.hostname === 'localhost' ||
  origin.hostname === '127.0.0.1' ||
  origin.pathname !== '/' ||
  origin.search ||
  origin.hash
) {
  throw new Error('NEXT_PUBLIC_SITE_URL must be the public HTTPS origin.');
}
const upload = process.env.MEDIA_UPLOAD_DIR;
if (!upload || !path.isAbsolute(upload)) {
  throw new Error('The public service requires an absolute, persistent MEDIA_UPLOAD_DIR.');
}
await access(upload, constants.R_OK | constants.W_OK);
console.log('Production configuration and persistent upload directory checked.');
