/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Cloudflare Pages — generates plain HTML/JS/CSS files
  output: 'export',

  // Image optimization not available with static export
  images: {
    unoptimized: true,
  },

  // Suppress hydration warnings from browser extensions
  reactStrictMode: true,

  // Skip TypeScript errors during build (we use @ts-nocheck throughout)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Skip ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
