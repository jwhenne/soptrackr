import { NextResponse } from 'next/server';
import { Client } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Temporary migration runner. Reads db/migrations/*.sql in alphabetical order
// and applies any not yet recorded in the _migrations table. Idempotent.
//
// Gated by a shared secret in MIGRATION_SECRET env var. Remove this route
// once we have a real migration workflow.

export async function POST(request: Request) {
  const url = new URL(request.url);
  const provided = url.searchParams.get('secret') || request.headers.get('x-migration-secret');
  const expected = process.env.MIGRATION_SECRET;

  if (!expected) {
    return NextResponse.json(
      { ok: false, error: 'MIGRATION_SECRET not set on server' },
      { status: 500 }
    );
  }
  if (provided !== expected) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL not set' }, { status: 500 });
  }

  const migrationsDir = path.join(process.cwd(), 'db', 'migrations');
  let files: string[];
  try {
    files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Could not read ${migrationsDir}: ${(err as Error).message}` },
      { status: 500 }
    );
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  const applied: string[] = [];
  const skipped: string[] = [];

  try {
    await client.connect();

    // Ensure bookkeeping table exists before checking which are applied
    await client.query(`
      create table if not exists _migrations (
        id serial primary key,
        filename text unique not null,
        applied_at timestamptz not null default now()
      );
    `);

    const { rows } = await client.query<{ filename: string }>('select filename from _migrations');
    const alreadyApplied = new Set(rows.map((r) => r.filename));

    for (const filename of files) {
      if (alreadyApplied.has(filename)) {
        skipped.push(filename);
        continue;
      }
      const sql = readFileSync(path.join(migrationsDir, filename), 'utf8');
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('commit');
        applied.push(filename);
      } catch (err) {
        await client.query('rollback');
        await client.end();
        return NextResponse.json(
          {
            ok: false,
            stage: 'apply',
            failedFile: filename,
            error: (err as Error).message,
            applied,
            skipped,
          },
          { status: 500 }
        );
      }
    }

    // Get a quick summary of what's in the DB now
    const tablesResult = await client.query<{ table_name: string }>(
      `select table_name from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE'
       order by table_name`
    );

    await client.end();

    return NextResponse.json({
      ok: true,
      applied,
      skipped,
      tables: tablesResult.rows.map((r) => r.table_name),
    });
  } catch (err) {
    try { await client.end(); } catch { /* ignore */ }
    return NextResponse.json(
      { ok: false, stage: 'connect', error: (err as Error).message },
      { status: 500 }
    );
  }
}

// Safety: GET returns instructions, not the actual run.
export async function GET() {
  return NextResponse.json({
    info: 'Migration runner. POST with ?secret=<MIGRATION_SECRET> to apply pending migrations.',
  });
}
