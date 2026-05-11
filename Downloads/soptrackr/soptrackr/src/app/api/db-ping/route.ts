import { NextResponse } from 'next/server';
import { Client } from 'pg';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return NextResponse.json(
      { ok: false, stage: 'config', error: 'DATABASE_URL not set' },
      { status: 500 }
    );
  }

  let host = 'unknown';
  try {
    host = new URL(url).hostname;
  } catch {
    return NextResponse.json(
      { ok: false, stage: 'parse', error: 'DATABASE_URL is not a valid URL' },
      { status: 500 }
    );
  }

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });

  try {
    await client.connect();
    const r = await client.query('SELECT version() AS v, now() AS now');
    await client.end();
    return NextResponse.json({
      ok: true,
      host,
      postgres: String(r.rows[0].v).split(',')[0],
      serverTime: r.rows[0].now,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string }).code ?? null;
    try { await client.end(); } catch { /* ignore */ }
    return NextResponse.json(
      { ok: false, stage: 'connect', host, code, error: message },
      { status: 500 }
    );
  }
}
