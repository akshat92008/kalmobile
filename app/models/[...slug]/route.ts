import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const REPO_RAW_ROOT = 'https://raw.githubusercontent.com/akshat92008/kaalyuga/main';
const LOCAL_PUBLIC_MODELS = '/tmp/kaalyuga/public/models';
const LOCAL_CUTSCENE_ASSETS = '/tmp/kaalyuga/cutscenes/assets';
const CACHE_MODELS_DIR = '/tmp/kaalyuga_cache/models';

const CUTSCENE_BOSS_FOLDERS = new Set([
  'Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx',
  'Meshy_AI_Infernal_Maw_Sovereign_20261025_texture_fbx',
  'Meshy_AI_Bloodbound_Titan_1025042731_texture_fbx',
  'Meshy_AI_Bloodbound_Warlord_1025041901_texture_fbx',
]);

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.fbx') return 'application/octet-stream';
  if (ext === '.glb' || ext === '.gltf') return 'model/gltf-binary';
  return 'application/octet-stream';
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await context.params;
    const cleanSegments = slug.map((s) => path.basename(s)).filter(Boolean);
    if (cleanSegments.length === 0) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const relPath = cleanSegments.join('/');
    const topFolder = cleanSegments[0];
    const mimeType = getMimeType(relPath);
    const headers = {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    };

    // 1. Check workspace public/models/ first, then /tmp caches
    const candidateLocalPaths = [
      path.join(process.cwd(), 'public', 'models', relPath),
      path.join(LOCAL_PUBLIC_MODELS, relPath),
      path.join(LOCAL_CUTSCENE_ASSETS, relPath),
      path.join(CACHE_MODELS_DIR, relPath),
    ];

    for (const candidate of candidateLocalPaths) {
      if (existsSync(candidate)) {
        const buf = await fs.readFile(candidate);
        return new NextResponse(new Uint8Array(buf), { status: 200, headers });
      }
    }

    // 2. Fetch from GitHub raw CDN (checking public/models or cutscenes/assets)
    const remotePrefix = CUTSCENE_BOSS_FOLDERS.has(topFolder)
      ? 'cutscenes/assets'
      : 'public/models';
    const encodedRel = cleanSegments.map((s) => encodeURIComponent(s)).join('/');
    let res = await fetch(`${REPO_RAW_ROOT}/${remotePrefix}/${encodedRel}`);
    if (!res.ok) {
      const altPrefix = remotePrefix === 'public/models' ? 'cutscenes/assets' : 'public/models';
      res = await fetch(`${REPO_RAW_ROOT}/${altPrefix}/${encodedRel}`);
    }

    if (!res.ok) {
      return new NextResponse(`Model asset not found: ${relPath}`, { status: res.status });
    }

    const arrayBuffer = await res.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    const cacheFile = path.join(CACHE_MODELS_DIR, relPath);
    try {
      await fs.mkdir(path.dirname(cacheFile), { recursive: true });
      await fs.writeFile(cacheFile, uint8);
    } catch {
      // Ignore cache write errors
    }

    return new NextResponse(uint8, { status: 200, headers });
  } catch (err) {
    return new NextResponse(
      err instanceof Error ? err.message : 'Model load error',
      { status: 500 }
    );
  }
}
