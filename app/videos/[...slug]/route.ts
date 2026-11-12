import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const CACHE_VIDEOS_DIR = ['', 'tmp', 'kaalyuga_cache', 'videos'].join('/');
const PUBLIC_VIDEOS_DIR = [process.cwd(), 'public', 'videos'].join('/');

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

    const baseHeaders: Record<string, string> = {
      'Content-Type': 'video/mp4',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes',
    };

    const respondWithBuffer = (buf: Buffer) => {
      const range = req.headers.get('range');
      if (range) {
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

    const candidates = [
      [PUBLIC_VIDEOS_DIR, relPath].join('/'),
      [CACHE_VIDEOS_DIR, relPath].join('/'),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        const buf = await fs.readFile(candidate);
        return respondWithBuffer(buf);
      }
    }

    const encodedRel = encodeURIComponent(relPath).replace(/%2F/g, '/');
    const remoteUrls = [
      `https://raw.githubusercontent.com/akshat92008/kaalyuga/main/public/videos/${encodedRel}`,
      `https://raw.githubusercontent.com/akshat92008/kaalyuga/main/videos/${encodedRel}`,
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
      return new NextResponse(`Video not found: ${relPath}`, { status: 404 });
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const cacheFile = [CACHE_VIDEOS_DIR, relPath].join('/');
    try {
      await fs.mkdir(path.dirname(cacheFile), { recursive: true });
      await fs.writeFile(cacheFile, buf);
    } catch {
      // Ignore cache write errors
    }

    return respondWithBuffer(buf);
  } catch (err) {
    return new NextResponse(
      err instanceof Error ? err.message : 'Video load error',
      { status: 500 }
    );
  }
}
