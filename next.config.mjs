/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Use Redis-backed cache handler for ISR and route handler caching.
  cacheHandler: new URL('./cache-handler.mjs', import.meta.url).pathname,
  // Disable default in-memory caching — Redis is the sole store.
  cacheMaxMemorySize: 0,
};

export default nextConfig;
