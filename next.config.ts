import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
  async rewrites() {
    const assetDirs = [
      'videos',
      'models',
      'animations',
      'audio',
      'images',
      'cutscenes',
      'new_3d_assets',
    ];
    return {
      beforeFiles: assetDirs.map((dir) => ({
        source: `/${dir}/:path*`,
        destination: `/api/static/${dir}/:path*`,
      })),
      fallback: [
        {
          source: '/assets/:path*',
          destination: '/api/static/assets/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
