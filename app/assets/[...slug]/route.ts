import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { existsSync, readdirSync } from 'fs';
import path from 'path';

const REPO_RAW_ROOT = 'https://raw.githubusercontent.com/akshat92008/kaalyuga/main';
const CACHE_BASE = ['', 'tmp', 'kaalyuga_cache'].join('/');
const PUBLIC_ASSETS_BASE = [process.cwd(), 'public', 'assets'].join('/');

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.ogg') return 'audio/ogg';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.json') return 'application/json';
  return 'application/octet-stream';
}

function normalizeForMatch(name: string): string {
  return name.toLowerCase().replace(/[\s_]+/g, '_');
}

function stripTrailingHexHash(stem: string): string {
  return stem.replace(/_[0-9a-f]{8}$/i, '');
}

function findFuzzyInDir(dirPath: string, targetFile: string): string | null {
  if (!existsSync(dirPath)) return null;
  const direct = [dirPath, targetFile].join('/');
  if (existsSync(direct)) return direct;

  let entries: string[] = [];
  try {
    entries = readdirSync(dirPath);
  } catch {
    return null;
  }

  const normTarget = normalizeForMatch(targetFile);
  const targetExt = path.extname(targetFile).toLowerCase();
  const targetStem = path.basename(targetFile, path.extname(targetFile));
  const normStemNoHash = normalizeForMatch(stripTrailingHexHash(targetStem));

  for (const entry of entries) {
    if (normalizeForMatch(entry) === normTarget) {
      return [dirPath, entry].join('/');
    }
  }

  for (const entry of entries) {
    const ext = path.extname(entry).toLowerCase();
    if (ext !== targetExt) continue;
    const stem = path.basename(entry, path.extname(entry));
    const normEntryStemNoHash = normalizeForMatch(stripTrailingHexHash(stem));
    if (normEntryStemNoHash === normStemNoHash) {
      return [dirPath, entry].join('/');
    }
    if (entry.includes('…')) {
      const [prefix] = stem.split('…');
      if (prefix && normalizeForMatch(targetStem).startsWith(normalizeForMatch(prefix))) {
        return [dirPath, entry].join('/');
      }
    }
  }

  return null;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await context.params;
    const cleanSegments = slug.map((s) => path.basename(s)).filter(Boolean);
    if (cleanSegments.length === 0) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const relPath = cleanSegments.join('/');
    const fileName = cleanSegments[cleanSegments.length - 1];
    const subDir = cleanSegments.length > 1 ? cleanSegments.slice(0, -1).join('/') : '';
    const mimeType = getMimeType(fileName);

    const baseHeaders: Record<string, string> = {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes',
    };

    const respondWithBuffer = (buf: Buffer) => {
      const range = req.headers.get('range');
      if (range && (mimeType.startsWith('audio/') || mimeType.startsWith('video/'))) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : buf.length - 1;
        if (!Number.isNaN(start) && start >= 0 && end < buf.length && start <= end) {
          const chunk = buf.subarray(start, end + 1);
          return new NextResponse(new Uint8Array(chunk), {
            status: 206,
            headers: {
              ...baseHeaders,
              'Content-Range': `bytes ${start}-${end}/${buf.length}`,
              'Content-Length': String(chunk.length),
            },
          });
        }
      }
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          ...baseHeaders,
          'Content-Length': String(buf.length),
        },
      });
    };

    // 1. Check local workspace and /tmp/kaalyuga_cache directories (with fuzzy filename support)
    const searchDirs = [
      subDir ? [PUBLIC_ASSETS_BASE, subDir].join('/') : PUBLIC_ASSETS_BASE,
      subDir ? [CACHE_BASE, subDir].join('/') : CACHE_BASE,
      subDir ? [CACHE_BASE, 'assets', subDir].join('/') : [CACHE_BASE, 'assets'].join('/'),
      [CACHE_BASE, 'aistudio'].join('/'),
      [CACHE_BASE, 'assets', 'aistudio'].join('/'),
    ];

    for (const dir of searchDirs) {
      const match = findFuzzyInDir(dir, fileName);
      if (match) {
        const buf = await fs.readFile(match);
        return respondWithBuffer(buf);
      }
    }

    // 2. Fetch from GitHub raw CDN and cache in /tmp/kaalyuga_cache/assets
    const encodedRel = cleanSegments.map((s) => encodeURIComponent(s)).join('/');
    const encodedFile = encodeURIComponent(fileName);
    const remoteUrls = [
      `${REPO_RAW_ROOT}/public/assets/${encodedRel}`,
      `${REPO_RAW_ROOT}/public/assets/aistudio/${encodedFile}`,
      `${REPO_RAW_ROOT}/public/assets/vfx/${encodedFile}`,
      `${REPO_RAW_ROOT}/public/assets/concepts/${encodedFile}`,
      `${REPO_RAW_ROOT}/public/audio/${encodedFile}`,
      `${REPO_RAW_ROOT}/soundtracks/${encodedFile}`,
    ];

    let res: Response | null = null;
    for (const url of remoteUrls) {
      const attempt = await fetch(url);
      if (attempt.ok) {
        res = attempt;
        break;
      }
    }

    if (!res || !res.ok) {
      return new NextResponse(`Asset not found: ${relPath}`, { status: 404 });
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const cacheFile = [CACHE_BASE, 'assets', relPath].join('/');
    try {
      await fs.mkdir(path.dirname(cacheFile), { recursive: true });
      await fs.writeFile(cacheFile, buf);
    } catch {
      // Ignore cache write errors
    }

    return respondWithBuffer(buf);
  } catch (err) {
    return new NextResponse(
      err instanceof Error ? err.message : 'Asset load error',
      { status: 500 }
    );
  }
}
