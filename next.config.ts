import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // Redis-backed cache handler for ISR and route handler caching.
  cacheHandler: './cache-handler.mjs',
  // Disable default in-memory caching — Redis is the sole store.
  cacheMaxMemorySize: 0,
}

export default nextConfig
