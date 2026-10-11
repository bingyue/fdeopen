import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
const output = path.resolve('.next/standalone');
await mkdir(path.join(output, '.next'), { recursive: true });
await cp('.next/static', path.join(output, '.next/static'), { recursive: true });
for (const dir of ['public', 'content', 'supabase'])
  await cp(dir, path.join(output, dir), { recursive: true });
console.log('Standalone assets prepared.');
