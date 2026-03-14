// Route Handler at / — used as both the health check and the
// app's only UI. Returns a visual HTML card showing live DB status
// and the greeting seeded by the migration.
//
// force-dynamic disables Next.js route caching so every request
// hits the database and reflects real connection state.
export const dynamic = 'force-dynamic';

import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  max: 5,
  connectionTimeoutMillis: 3000,
});

// Build metadata written by scripts/generate-build-info.js before
// `next build` and deployed alongside the standalone bundle.
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
  let greeting = '';
  let dbStatus = '';
  let httpStatus = 200;

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT message FROM greetings LIMIT 1'
      );
      greeting = result.rows[0]?.message ?? 'No greeting found';
      dbStatus = 'Connected';
    } finally {
      client.release();
    }
  } catch (err) {
    greeting = 'Hello from Zerops!';
    dbStatus = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
    httpStatus = 503;
  }

  const env = process.env.NODE_ENV ?? 'production';
  const dbStatusColor = httpStatus === 200 ? '#4ade80' : '#f87171';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Next.js · Zerops Hello World</title>
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
    .db-status { color: ${dbStatusColor}; }
    tr + tr td { margin-top: 2px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logos">
      <span class="logo-next">Next.js</span>
      <span class="logo-sep">×</span>
      <span class="logo-zerops">Zerops</span>
    </div>
    <h1>${greeting}</h1>
    <p class="subtitle">Next.js running on Zerops SSR &mdash; Node.js at runtime.</p>
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
        <td>Database</td>
        <td class="db-status">${dbStatus}</td>
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
