import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'nhandan.vn',
      },
      {
        protocol: 'https',
        hostname: '*.nhandan.vn',
      },
      {
        protocol: 'https',
        hostname: 'vcdn-giaitri.vnecdn.net',
      },
      {
        protocol: 'https',
        hostname: 'vcdn1-giaitri.vnecdn.net',
      },
      {
        protocol: 'https',
        hostname: 'vcdn-kinhdoanh.vnecdn.net',
      },
      {
        protocol: 'https',
        hostname: 'vcdn-thethao.vnecdn.net',
      },
      {
        protocol: 'https',
        hostname: 'vcdn-dulich.vnecdn.net',
      },
      {
        protocol: 'https',
        hostname: 'vcdn-suckhoe.vnecdn.net',
      },
      {
        protocol: 'https',
        hostname: 'vcdn-doisong.vnecdn.net',
      },
      {
        protocol: 'https',
        hostname: 'vcdn-khoahoc.vnecdn.net',
      },
      {
        protocol: 'https',
        hostname: 'vcdn-sohoa.vnecdn.net',
      },
      {
        protocol: 'https',
        hostname: 'vcdn-vnexpress.vnecdn.net',
      },
      {
        protocol: 'https',
        hostname: '**.vnecdn.net',
      },
      {
        protocol: 'https',
        hostname: '**.vietnamplus.vn',
      },
      {
        protocol: 'https',
        hostname: '**.chinhphu.vn',
      }
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
