import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const CACHE_BASE = ['', 'tmp', 'kaalyuga_cache'].join('/');
const PUBLIC_AUDIO_DIR = [process.cwd(), 'public', 'audio'].join('/');

function getAudioMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.ogg') return 'audio/ogg';
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
    const baseName = path.basename(relPath);
    const mimeType = getAudioMimeType(relPath);

    const baseHeaders: Record<string, string> = {
      'Content-Type': mimeType,
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
      [PUBLIC_AUDIO_DIR, relPath].join('/'),
      [CACHE_BASE, 'audio', relPath].join('/'),
      [CACHE_BASE, 'sfx', baseName].join('/'),
      [CACHE_BASE, 'soundtracks', baseName].join('/'),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        const buf = await fs.readFile(candidate);
        return respondWithBuffer(buf);
      }
    }

    const encodedRel = encodeURIComponent(relPath).replace(/%2F/g, '/');
    const encodedBase = encodeURIComponent(baseName);
    const remoteUrls = [
      `https://raw.githubusercontent.com/akshat92008/kaalyuga/main/public/audio/${encodedRel}`,
      `https://raw.githubusercontent.com/akshat92008/kaalyuga/main/${encodedRel}`,
      `https://raw.githubusercontent.com/akshat92008/kaalyuga/main/sfx/${encodedBase}`,
      `https://raw.githubusercontent.com/akshat92008/kaalyuga/main/soundtracks/${encodedBase}`,
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
      return new NextResponse(`Audio not found: ${relPath}`, { status: 404 });
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const cacheFile = [CACHE_BASE, 'audio', relPath].join('/');
    try {
      await fs.mkdir(path.dirname(cacheFile), { recursive: true });
      await fs.writeFile(cacheFile, buf);
    } catch {
      // Ignore cache write errors
    }

    return respondWithBuffer(buf);
  } catch (err) {
    return new NextResponse(
      err instanceof Error ? err.message : 'Audio load error',
      { status: 500 }
    );
  }
}
