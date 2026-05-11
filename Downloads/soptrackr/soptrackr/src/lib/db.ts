import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

// One Pool per Node process. The Vercel Function can be reused across requests,
// so we cache the Pool on globalThis to avoid leaking connections during HMR.
declare global {
  // eslint-disable-next-line no-var
  var __sopPgPool: Pool | undefined;
}

function getPool(): Pool {
  if (!global.__sopPgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }
    global.__sopPgPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      // Supabase's pooler limits per-tenant connections; keep this small.
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return global.__sopPgPool;
}

/** Run a query against the pool. Use for queries that don't need session state. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

/**
 * Run a callback with a dedicated client checked out of the pool, inside a
 * transaction with RLS-enforcing role + tenant context set up.
 *
 * IMPORTANT: our DATABASE_URL connects as a Supabase role with BYPASSRLS,
 * so we MUST `set local role authenticated` before any tenant query — that
 * role is subject to RLS policies. Without this, RLS is silently ignored.
 *
 * The clerk_user_id is also set as a session variable so the policy helpers
 * (current_clerk_user_id(), is_org_member(), etc.) can scope each query.
 *
 * Pass clerkUserId = null only when you explicitly want to test "anonymous"
 * access (will return 0 rows from RLS-protected tables).
 *
 * Use this for any query that touches RLS-protected tables.
 */
export async function withTenantClient<T>(
  clerkUserId: string | null,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    // Switch to authenticated role so RLS applies (postgres bypasses RLS).
    await client.query('set local role authenticated');
    if (clerkUserId) {
      // set_config(name, value, is_local=true) makes this scoped to the txn
      await client.query("select set_config('app.current_clerk_user_id', $1, true)", [clerkUserId]);
    }
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (err) {
    try { await client.query('rollback'); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
}
