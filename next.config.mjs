/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@mezo-org/passport', '@mezo-org/orangekit', '@rainbow-me/rainbowkit'],
};

export default nextConfig;
