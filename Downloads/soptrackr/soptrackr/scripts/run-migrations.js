// Apply any unapplied SQL files from db/migrations/ against $DATABASE_URL.
//
// Each migration file is responsible for its own `insert into _migrations (filename)`
// at the bottom (see 001_init_multitenant.sql). This runner just enforces
// ordering and skips already-applied files.
//
// Usage:
//   node --env-file=.env.local scripts/run-migrations.js
//
// Idempotent: safe to re-run after pulling new migrations from main.

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Run with: node --env-file=.env.local scripts/run-migrations.js');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
  });

  try {
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort(); // lexicographic — 001, 002, ... 012

    console.log(`Found ${files.length} migration file(s) in ${MIGRATIONS_DIR}`);

    // Bootstrap the _migrations table on first run (001 creates it but only after
    // its body runs — we need to be able to query it before applying anything).
    await pool.query(`
      create table if not exists _migrations (
        id          serial primary key,
        filename    text unique not null,
        applied_at  timestamptz not null default now()
      );
    `);

    const appliedRes = await pool.query('select filename from _migrations');
    const applied = new Set(appliedRes.rows.map((r) => r.filename));
    console.log(`Already applied: ${applied.size}`);

    let appliedThisRun = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  ↳ skip   ${file}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`  ↳ apply  ${file} (${sql.length} bytes)`);
      try {
        await pool.query(sql);
        appliedThisRun++;
      } catch (err) {
        console.error(`\nFAILED on ${file}:`);
        console.error(err.message);
        if (err.position) console.error(`  at character position ${err.position}`);
        process.exit(1);
      }
    }

    // Sanity: every file should now be tracked in _migrations
    const finalRes = await pool.query('select count(*) as n from _migrations');
    console.log(`\nDone. Applied this run: ${appliedThisRun}.  Total tracked in _migrations: ${finalRes.rows[0].n}.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
