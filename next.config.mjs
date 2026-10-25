/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@mezo-org/passport', '@mezo-org/orangekit', '@rainbow-me/rainbowkit'],
  async headers() {
    return [
      {
        // Immutable cache for static font files
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // HTML pages and dynamic routes: require revalidation so new CSS and gradients invalidate immediately
        source: '/((?!_next/static|_next/image|fonts|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
