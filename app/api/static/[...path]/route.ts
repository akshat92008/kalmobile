import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/akshat92008/kaalyuga/main';
const LOCAL_REPO_DIR = '/tmp/kaalyuga';
const DISK_CACHE_DIR = '/tmp/kaliyuga_static_cache';

try {
  if (!fs.existsSync(DISK_CACHE_DIR)) {
    fs.mkdirSync(DISK_CACHE_DIR, { recursive: true });
  }
} catch {}

const MIME_MAP: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.fbx': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.json': 'application/json',
};

// Bounded 256 MB in-memory LRU buffer cache + /tmp tmpfs persistent cache
const MAX_CACHE_BYTES = 256 * 1024 * 1024;
let currentCacheBytes = 0;
const memoryCache = new Map<string, Buffer>();
const inflightFetches = new Map<string, Promise<Buffer | null>>();

function getDiskCachePath(cacheKey: string): string {
  const hash = crypto.createHash('sha1').update(cacheKey).digest('hex');
  return path.join(DISK_CACHE_DIR, `${hash}.bin`);
}

function putInCache(key: string, buf: Buffer): void {
  try {
    const diskPath = getDiskCachePath(key);
    if (!fs.existsSync(diskPath)) {
      fs.writeFileSync(diskPath, buf);
    }
  } catch {}

  if (buf.byteLength > 45 * 1024 * 1024) {
    return;
  }
  if (memoryCache.has(key)) {
    const prev = memoryCache.get(key)!;
    currentCacheBytes -= prev.byteLength;
    memoryCache.delete(key);
  }
  while (currentCacheBytes + buf.byteLength > MAX_CACHE_BYTES && memoryCache.size > 0) {
    const oldestKey = memoryCache.keys().next().value;
    if (!oldestKey) break;
    const oldBuf = memoryCache.get(oldestKey)!;
    currentCacheBytes -= oldBuf.byteLength;
    memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, buf);
  currentCacheBytes += buf.byteLength;
}

async function fetchFromGitHub(segments: string[]): Promise<Buffer | null> {
  const decoded = segments.map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });

  const repoRel =
    decoded[0] === 'new_3d_assets'
      ? ['new 3D assets and animations', ...decoded.slice(1)]
      : ['public', ...decoded];

  const cacheKey = repoRel.join('/');
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }
  try {
    const roots = [LOCAL_REPO_DIR, '/tmp/kaalyuga_repo', process.cwd()];
    const relVariants: string[][] = [repoRel];
    if (decoded[0] !== 'new_3d_assets') {
      relVariants.push(decoded);
    }
    const lastSeg = repoRel[repoRel.length - 1];
    if (lastSeg) {
      if (lastSeg.includes('...') || lastSeg.includes('…')) {
        const altLast = lastSeg.includes('...')
          ? lastSeg.replace(/\.\.\./g, '…')
          : lastSeg.replace(/…/g, '...');
        relVariants.push([...repoRel.slice(0, -1), altLast]);
      }
      if (lastSeg.includes('enviro_')) {
        relVariants.push([
          ...repoRel.slice(0, -1),
          lastSeg.replace('enviro_', 'enviro…_'),
        ]);
      }
    }
    for (const rootDir of roots) {
      for (const relParts of relVariants) {
        const localPath = path.join(rootDir, ...relParts);
        if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
          const localBuf = fs.readFileSync(localPath);
          if (localBuf.byteLength > 0) {
            if (localBuf.byteLength <= 45 * 1024 * 1024) {
              memoryCache.set(cacheKey, localBuf);
            }
            return localBuf;
          }
        }
      }
    }

    const diskPath = getDiskCachePath(cacheKey);
    if (fs.existsSync(diskPath)) {
      const diskBuf = fs.readFileSync(diskPath);
      if (diskBuf.byteLength > 0) {
        putInCache(cacheKey, diskBuf);
        return diskBuf;
      }
    }
  } catch {}

  if (inflightFetches.has(cacheKey)) {
    return inflightFetches.get(cacheKey)!;
  }

  const task = (async (): Promise<Buffer | null> => {
    const tryFetch = async (relParts: string[]): Promise<Buffer | null> => {
      const encodedPath = relParts.map((s) => encodeURIComponent(s)).join('/');
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(`${GITHUB_RAW_BASE}/${encodedPath}`);
          if (!res.ok) return null;
          const ab = await res.arrayBuffer();
          return Buffer.from(ab);
        } catch {
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 250));
          }
        }
      }
      return null;
    };

    let buf = await tryFetch(repoRel);
    if (!buf) {
      const lastIdx = repoRel.length - 1;
      const last = repoRel[lastIdx];
      if (last) {
        if (last.includes('...') || last.includes('…')) {
          const altLast = last.includes('...')
            ? last.replace(/\.\.\./g, '…')
            : last.replace(/…/g, '...');
          buf = await tryFetch([...repoRel.slice(0, -1), altLast]);
        }
        if (!buf && last.includes('enviro_')) {
          const altLast = last.replace('enviro_', 'enviro…_');
          buf = await tryFetch([...repoRel.slice(0, -1), altLast]);
        }
      }
    }

    if (buf) {
      putInCache(cacheKey, buf);
    }
    return buf;
  })();

  inflightFetches.set(cacheKey, task);
  try {
    return await task;
  } finally {
    inflightFetches.delete(cacheKey);
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await context.params;
  if (!segments || segments.length === 0) {
    return new NextResponse('Bad request', { status: 400 });
  }

  const buffer = await fetchFromGitHub(segments);
  if (!buffer) {
    return new NextResponse('Asset not found', { status: 404 });
  }

  const fileSize = buffer.byteLength;
  const lastSegment = segments[segments.length - 1] || '';
  const ext = path.extname(lastSegment).toLowerCase();
  const contentType = MIME_MAP[ext] || 'application/octet-stream';
  const range = req.headers.get('range');

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (isNaN(start) || isNaN(end) || start >= fileSize || end >= fileSize) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          'Content-Range': `bytes */${fileSize}`,
        },
      });
    }

    const chunk = buffer.subarray(start, end + 1);
    return new NextResponse(new Uint8Array(chunk), {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunk.byteLength),
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Accept-Ranges': 'bytes',
      'Content-Length': String(fileSize),
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
