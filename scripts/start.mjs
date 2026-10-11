import { spawn } from 'node:child_process';
import path from 'node:path';
const env = {
  ...process.env,
  PORT: process.env.PORT || '3210',
  HOSTNAME: process.env.HOSTNAME || '0.0.0.0',
  DEMO_DATA_DIR: path.resolve(process.env.DEMO_DATA_DIR || '.data/fdeopen'),
};
const child = spawn(process.execPath, ['.next/standalone/server.js'], { stdio: 'inherit', env });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => process.exit(code ?? 0));
