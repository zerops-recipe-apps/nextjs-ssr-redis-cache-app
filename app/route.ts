// Route Handler at / — serves a visual HTML card showing Redis cache
// status and demonstrating cache simulation.
//
// Each request writes a timestamp to Redis and reads it back, proving
// the cache layer is alive. The Next.js cacheHandler (backed by Redis)
// handles ISR caching for other routes; this one is force-dynamic so
// it always shows fresh Redis status (and doesn't require Redis at
// build time).
export const dynamic = 'force-dynamic';

import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from 'redis';

const REDIS_URL =
  process.env.REDIS_URL ||
  `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}`;

interface BuildInfo {
  version: string;
  buildTime: string;
}

function getBuildInfo(): BuildInfo {
  try {
    const raw = readFileSync(join(process.cwd(), 'build-info.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return { version: 'unknown', buildTime: new Date().toISOString() };
  }
}

export async function GET() {
  const buildInfo = getBuildInfo();
  let redisStatus = '';
  let cachedValue = '';
  let httpStatus = 200;
  const now = new Date().toISOString();

  let client;
  try {
    client = createClient({ url: REDIS_URL });
    client.on('error', () => {}); // suppress background errors during connect
    await client.connect();

    // Write a simulated cache entry
    await client.set('hello:cache', `Cached at ${now}`, { EX: 30 });

    // Read it back
    cachedValue = (await client.get('hello:cache')) ?? 'No cached value';
    redisStatus = 'Connected';

    await client.quit();
  } catch (err) {
    cachedValue = 'Hello from Zerops!';
    redisStatus = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
    httpStatus = 503;
    try {
      await client?.quit();
    } catch {
      // already disconnected
    }
  }

  const env = process.env.NODE_ENV ?? 'production';
  const statusColor = httpStatus === 200 ? '#4ade80' : '#f87171';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Next.js · Zerops Redis Cache</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
        'Helvetica Neue', Arial, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 2.5rem;
      max-width: 540px;
      width: 100%;
      box-shadow: 0 25px 50px rgba(0,0,0,0.4);
    }
    .logos {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .logo-next {
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: -0.05em;
      color: #ffffff;
    }
    .logo-sep {
      color: #475569;
      font-size: 1.4rem;
    }
    .logo-zerops {
      font-size: 1.3rem;
      font-weight: 700;
      color: #818cf8;
    }
    h1 {
      font-size: 1.9rem;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 0.4rem;
      line-height: 1.2;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 0.9rem;
      margin-bottom: 2rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    tr + tr { border-top: 1px solid #1e293b; }
    td {
      padding: 0.6rem 0.8rem;
      background: #0f172a;
    }
    td:first-child {
      color: #94a3b8;
      width: 40%;
      border-radius: 4px 0 0 4px;
    }
    td:last-child {
      color: #f1f5f9;
      font-weight: 500;
      border-radius: 0 4px 4px 0;
    }
    .status { color: ${statusColor}; }
    tr + tr td { margin-top: 2px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logos">
      <span class="logo-next">Next.js</span>
      <span class="logo-sep">&times;</span>
      <span class="logo-zerops">Zerops</span>
    </div>
    <h1>${cachedValue}</h1>
    <p class="subtitle">Next.js with Redis cache on Zerops &mdash; ISR revalidates every 10 s.</p>
    <table>
      <tr>
        <td>Framework</td>
        <td>Next.js ${buildInfo.version}</td>
      </tr>
      <tr>
        <td>Environment</td>
        <td>${env}</td>
      </tr>
      <tr>
        <td>Built at</td>
        <td>${buildInfo.buildTime}</td>
      </tr>
      <tr>
        <td>Rendered at</td>
        <td>${now}</td>
      </tr>
      <tr>
        <td>Redis</td>
        <td class="status">${redisStatus}</td>
      </tr>
    </table>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: httpStatus,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
