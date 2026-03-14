// Custom Next.js cache handler backed by Redis.
// Used by `cacheHandler` in next.config.mjs for ISR and route handler
// response caching. Stores serialized cache entries in Redis with TTL.
//
// Connection is lazy — during `next build` there is no Redis server,
// so all operations gracefully no-op until a connection succeeds.
import { createClient } from 'redis';

const REDIS_URL =
  process.env.REDIS_URL ||
  `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}`;

const TAG_PREFIX = '_tag:';

let client;
let connectionPromise;

async function getClient() {
  if (client?.isReady) return client;

  if (connectionPromise) {
    await connectionPromise;
    return client?.isReady ? client : null;
  }

  try {
    client = createClient({ url: REDIS_URL });
    client.on('error', () => {}); // suppress noisy background errors
    connectionPromise = client.connect();
    await connectionPromise;
    return client;
  } catch {
    // Redis unavailable (e.g. during build) — degrade gracefully
    client = null;
    connectionPromise = null;
    return null;
  }
}

export default class CacheHandler {
  constructor(options) {
    this.options = options;
  }

  async get(key) {
    try {
      const redis = await getClient();
      if (!redis) return null;

      const stored = await redis.get(key);
      if (!stored) return null;

      const data = JSON.parse(stored);

      if (data.tags?.length) {
        for (const tag of data.tags) {
          const revalidatedAt = await redis.get(`${TAG_PREFIX}${tag}`);
          if (revalidatedAt && Number(revalidatedAt) > data.lastModified) {
            return null;
          }
        }
      }

      return data;
    } catch {
      return null;
    }
  }

  async set(key, data, ctx) {
    try {
      const redis = await getClient();
      if (!redis) return;

      const entry = {
        value: data,
        lastModified: Date.now(),
        tags: ctx?.tags || [],
      };

      const ttl = ctx?.revalidate;
      if (ttl) {
        await redis.set(key, JSON.stringify(entry), { EX: ttl });
      } else {
        await redis.set(key, JSON.stringify(entry));
      }
    } catch {
      // Redis write failed — silent degradation
    }
  }

  async revalidateTag(tags) {
    try {
      const redis = await getClient();
      if (!redis) return;

      const tagList = Array.isArray(tags) ? tags : [tags];
      const now = Date.now().toString();
      for (const tag of tagList) {
        await redis.set(`${TAG_PREFIX}${tag}`, now);
      }
    } catch {
      // silent degradation
    }
  }

  resetRequestCache() {}
}
