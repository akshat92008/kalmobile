import { NextRequest } from 'next/server';
import { serveStaticAsset } from '@/lib/server/staticAssetProxy';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await context.params;
  return serveStaticAsset(req, 'cutscenes', slug);
}
