/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pg-okayama-office-manager.s3.ap-northeast-1.amazonaws.com',
        pathname: '/user-icons/**',
      },
    ],
  },
};

module.exports = nextConfig;
