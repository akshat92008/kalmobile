import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');

// Stop any background git clone and free RAM-backed /tmp space immediately
try {
  execSync('pkill -9 -f kaalyuga_sparse || true', { stdio: 'ignore' });
} catch {
  // ignore
}

for (const tmpPath of [
  '/tmp/kaalyuga_sparse',
  '/tmp/kaalyuga_sparse.tmp',
  '/tmp/kaalyuga_sparse.lock',
]) {
  if (fs.existsSync(tmpPath)) {
    try {
      fs.rmSync(tmpPath, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

// Keep /public free of heavy binary directories; /app/api/static/[...path]/route.ts serves assets on-demand
const heavyDirsToClean = [
  'videos',
  'models',
  'animations',
  'audio',
  'images',
  'cutscenes',
  'new_3d_assets',
];
for (const dir of heavyDirsToClean) {
  const fullPath = path.join(publicDir, dir);
  if (fs.existsSync(fullPath)) {
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

console.log('[ensure-assets] On-demand static asset proxy active.');
