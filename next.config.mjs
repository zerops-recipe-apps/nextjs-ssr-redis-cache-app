/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone mode bundles all runtime dependencies using
  // @vercel/nft import tracing - no node_modules needed at runtime.
  output: 'standalone',
};

export default nextConfig;
