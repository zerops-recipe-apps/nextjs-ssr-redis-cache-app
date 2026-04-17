# nextjs-ssr-redis-cache-app

Next.js 15 SSR app with a Redis-backed custom cache handler for consistent ISR and route caching across multiple Zerops containers.

## Zerops service facts

- HTTP port: `3000`
- Siblings: `redis` (KeyDB/Redis) — env: `REDIS_HOST`, `REDIS_PORT`
- Runtime base: `nodejs@22`

## Zerops dev

`setup: dev` idles on `zsc noop --silent`; the agent starts the dev server.

- Dev command: `npm run dev`
- In-container rebuild without deploy: `npm run build`

**All platform operations (start/stop/status/logs of the dev server, deploy, env / scaling / storage / domains) go through the Zerops development workflow via `zcp` MCP tools. Don't shell out to `zcli`.**

## Notes

- `output: 'standalone'` + custom `cacheHandler` (`cache-handler.mjs`) enables consistent ISR/cache across multiple containers via Redis.
- `cacheMaxMemorySize: 0` disables Next.js in-memory cache — Redis is the sole store.
- Redis connection is lazy and degrades silently during `next build` (no Redis available at build time).
- Do NOT cache `.next/cache` — Zerops cache restore causes EACCES on subsequent builds.
