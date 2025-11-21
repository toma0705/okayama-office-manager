import type { NextConfig } from 'next';

const supabaseHostnames = (() => {
  const candidates = [
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_STORAGE_PUBLIC_URL,
  ];

  const hostnames = new Set<string>();

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      hostnames.add(new URL(candidate).hostname);
    } catch {
      // ignore malformed URLs
    }
  }

  if (hostnames.size === 0) {
    console.warn(
      '[next.config.ts] Supabase の URL 環境変数が未設定です。画像ホストの許可が行われません。',
    );
  }

  return Array.from(hostnames);
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostnames.map(hostname => ({
      protocol: 'https',
      hostname,
      pathname: '/storage/v1/object/public/**',
    })),
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
