/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "tong.visitkorea.or.kr" },
      { protocol: "http", hostname: "tong.visitkorea.or.kr" },
      { protocol: "https", hostname: "**.kakaocdn.net" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

module.exports = nextConfig;
