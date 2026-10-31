import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // アプリ（iOS・Android）から API を呼べるようにする。認証は Authorization ヘッダーのトークンで行う
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
