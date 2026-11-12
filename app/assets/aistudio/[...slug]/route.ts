import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const REPO_RAW_BASE = 'https://raw.githubusercontent.com/akshat92008/kaalyuga/main/public/assets/aistudio';
const LOCAL_REPO_DIR = '/tmp/kaalyuga/public/assets/aistudio';
const CACHE_DIR = '/tmp/kaalyuga_cache/assets/aistudio';

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.ogg') return 'audio/ogg';
  if (ext === '.m4a') return 'audio/mp4';
  return 'application/octet-stream';
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await context.params;
    const relPath = slug.map((s) => path.basename(s)).join('/');
    if (!relPath) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const mimeType = getMimeType(relPath);
    const baseHeaders: Record<string, string> = {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes',
    };

    const respondWithBuffer = (buf: Buffer) => {
      const range = req.headers.get('range');
      if (range && mimeType.startsWith('audio/')) {
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

    // 1. Check workspace public/assets/aistudio and public/audio first
    const workspaceCandidates = [
      path.join(process.cwd(), 'public', 'assets', 'aistudio', relPath),
      path.join(process.cwd(), 'public', 'audio', relPath),
      path.join(LOCAL_REPO_DIR, relPath),
      path.join(CACHE_DIR, relPath),
    ];

    for (const candidate of workspaceCandidates) {
      if (existsSync(candidate)) {
        const buf = await fs.readFile(candidate);
        return respondWithBuffer(buf);
      }
    }

    // 2. Fetch from GitHub raw CDN and cache in /tmp
    const encodedRel = encodeURIComponent(relPath).replace(/%2F/g, '/');
    const remoteUrls = [
      `${REPO_RAW_BASE}/${encodedRel}`,
      `https://raw.githubusercontent.com/akshat92008/kaalyuga/main/public/audio/${encodedRel}`,
      `https://raw.githubusercontent.com/akshat92008/kaalyuga/main/soundtracks/${encodedRel}`,
      `https://raw.githubusercontent.com/akshat92008/kaalyuga/main/${encodedRel}`,
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
    const arrayBuffer = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);

    const cacheFile = path.join(CACHE_DIR, relPath);
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
