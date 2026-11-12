import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';

const REPO_PUBLIC_DIR = '/tmp/kaalyuga_repo/public';
const LOCAL_PUBLIC_DIR = path.join(process.cwd(), 'public');

let repoEnsureAttempted = false;

function ensureRepoExists() {
  if (fs.existsSync(REPO_PUBLIC_DIR)) return;
  if (repoEnsureAttempted) return;
  repoEnsureAttempted = true;
  try {
    execSync('git clone --depth 1 https://github.com/akshat92008/kaalyuga.git /tmp/kaalyuga_repo', {
      stdio: 'ignore',
      timeout: 60000,
    });
  } catch {
    // Ignore clone error if offline
  }
}

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.fbx': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.json': 'application/json',
};

function normalizeName(name: string): string {
  return name
    .replace(/…|\.\.\./g, '')
    .replace(/[\s_]+/g, '_')
    .toLowerCase();
}

function stripTrailingHexHash(baseNoExt: string): string {
  return baseNoExt.replace(/_[0-9a-f]{8}$/i, '');
}

function findMatchingFileInDir(dirPath: string, targetFileName: string): string | null {
  if (!fs.existsSync(dirPath)) return null;

  const directPath = path.join(dirPath, targetFileName);
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return directPath;
  }

  try {
    const entries = fs.readdirSync(dirPath);
    const ext = path.extname(targetFileName).toLowerCase();
    const normTarget = normalizeName(targetFileName);
    const targetBaseNoExt = stripTrailingHexHash(path.basename(normTarget, ext));
    const hashMatch = normTarget.match(/_([0-9a-f]{8})\.[a-z0-9]+$/i);
    const prefix18 = targetBaseNoExt.slice(0, 18);

    for (const entry of entries) {
      const entryExt = path.extname(entry).toLowerCase();
      if (entryExt !== ext) continue;

      const normEntry = normalizeName(entry);
      if (normEntry === normTarget) {
        const candidate = path.join(dirPath, entry);
        if (fs.statSync(candidate).isFile()) return candidate;
      }

      const entryBaseNoExt = stripTrailingHexHash(path.basename(normEntry, entryExt));
      if (entryBaseNoExt === targetBaseNoExt && targetBaseNoExt.length >= 6) {
        const candidate = path.join(dirPath, entry);
        if (fs.statSync(candidate).isFile()) return candidate;
      }

      if (
        hashMatch &&
        normEntry.includes(hashMatch[1].toLowerCase()) &&
        normEntry.startsWith(prefix18)
      ) {
        const candidate = path.join(dirPath, entry);
        if (fs.statSync(candidate).isFile()) return candidate;
      }
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

export function resolveAssetFile(prefixFolder: string, slug: string[]): string | null {
  ensureRepoExists();

  const dirSegments = slug.slice(0, -1);
  const fileName = decodeURIComponent(slug[slug.length - 1] || '');
  const roots = [LOCAL_PUBLIC_DIR, REPO_PUBLIC_DIR];

  // 1. Exact directory match first
  for (const root of roots) {
    const targetDir = path.join(root, prefixFolder, ...dirSegments);
    const found = findMatchingFileInDir(targetDir, fileName);
    if (found) return found;
  }

  // 2. Search across all known asset/media directories in both roots
  const searchDirs: string[][] = [
    ['assets'],
    ['assets', 'aistudio'],
    ['assets', 'vfx'],
    ['assets', 'concepts'],
    ['audio'],
    ['audio', 'sfx'],
    ['videos'],
    ['cutscenes'],
    ['models', ...dirSegments],
  ];

  for (const root of roots) {
    for (const sub of searchDirs) {
      const found = findMatchingFileInDir(path.join(root, ...sub), fileName);
      if (found) return found;
    }
  }

  return null;
}

export async function serveStaticAsset(
  req: NextRequest,
  prefixFolder: string,
  slug: string[]
): Promise<NextResponse> {
  const filePath = resolveAssetFile(prefixFolder, slug);
  if (!filePath) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_MAP[ext] || 'application/octet-stream';

  const range = req.headers.get('range');
  if (
    range &&
    (ext === '.mp4' || ext === '.webm' || ext === '.mp3' || ext === '.wav' || ext === '.ogg')
  ) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = Math.max(0, end - start + 1);
    const buffer = Buffer.alloc(chunkSize);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, chunkSize, start);
    fs.closeSync(fd);

    return new NextResponse(buffer, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(stat.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
