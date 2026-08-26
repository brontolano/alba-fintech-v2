import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const nextBin = resolve('node_modules', 'next', 'dist', 'bin', 'next');
const nextBuild = spawn(process.execPath, [nextBin, 'build'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
});

nextBuild.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  }
  process.exit(code ?? 1);
});
