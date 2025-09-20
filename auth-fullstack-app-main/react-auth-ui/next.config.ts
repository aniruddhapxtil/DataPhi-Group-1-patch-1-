import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This rewrites block will proxy requests from your frontend's /api route
  // to your backend server running on port 8000.
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/:path*', // Proxy to Backend
      },
    ]
  },
}

export default nextConfig
