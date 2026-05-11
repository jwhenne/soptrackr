import { NextResponse } from 'next/server';
import { query, withTenantClient } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Multi-tenant isolation proof-test.
// Creates a fake "Isolation Test Org" with a fake user + SOP, then runs the
// app's tenant-scoped queries from each user's perspective and verifies that
// neither user can see the other's data. Cleans up after itself.
//
// Gated by MIGRATION_SECRET (same as /api/admin/migrate). Remove this route
// before going public.
//
// POST /api/admin/isolation-test?secret=<MIGRATION_SECRET>

type Check = { name: string; ok: boolean; detail?: string };

export async function POST(request: Request) {
  const url = new URL(request.url);
  const provided = url.searchParams.get('secret') || request.headers.get('x-migration-secret');
  if (provided !== process.env.MIGRATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const checks: Check[] = [];
  const fakeClerkId = `test_isolation_${Date.now()}`;
  const fakeOrgName = `__Isolation Test Org ${Date.now()}`;
  let fakeOrgId: string | null = null;
  let fakeUserId: string | null = null;
  let fakeSopId: string | null = null;
  let fakeRooftopId: string | null = null;

  try {
    // -------------------------------------------------------------------
    // Setup: create a fake org + user + rooftop + SOP via direct queries
    // (no tenant context = postgres role = RLS bypass, since we own the tables)
    // -------------------------------------------------------------------
    const orgRes = await query<{ id: string }>(
      `insert into organizations (name, slug) values ($1, $2) returning id`,
      [fakeOrgName, `iso-${Date.now()}`]
    );
    fakeOrgId = orgRes.rows[0].id;

    const userRes = await query<{ id: string }>(
      `insert into users (clerk_user_id, email, first_name)
       values ($1, $2, $3) returning id`,
      [fakeClerkId, `iso-${Date.now()}@test.invalid`, 'Isolation']
    );
    fakeUserId = userRes.rows[0].id;

    await query(
      `insert into org_members (org_id, user_id, role) values ($1, $2, 'admin')`,
      [fakeOrgId, fakeUserId]
    );

    const rooftopRes = await query<{ id: string }>(
      `insert into rooftops (org_id, name, brand) values ($1, 'Test Honda', 'Honda') returning id`,
      [fakeOrgId]
    );
    fakeRooftopId = rooftopRes.rows[0].id;

    const sopRes = await query<{ id: string }>(
      `insert into sops (org_id, rooftop_id, ro_number, sop_number, part_description, customer_name)
       values ($1, $2, 'RO-ISO-99999', 'SOP-ISO-99999', '__Isolation Test Part__', '__Isolation Test Customer__')
       returning id`,
      [fakeOrgId, fakeRooftopId]
    );
    fakeSopId = sopRes.rows[0].id;

    // Find a real user from the existing data so we can simulate them
    const realUserRes = await query<{ clerk_user_id: string; org_id: string; org_name: string }>(
      `select u.clerk_user_id, m.org_id, o.name as org_name
       from users u
       join org_members m on m.user_id = u.id
       join organizations o on o.id = m.org_id
       where u.clerk_user_id not like 'test_isolation_%'
       limit 1`
    );
    if (realUserRes.rows.length === 0) {
      throw new Error('No real user found to test against — sign up first');
    }
    const real = realUserRes.rows[0];

    // -------------------------------------------------------------------
    // CHECK 1: Real user sees their org's SOPs but NOT the fake one
    // -------------------------------------------------------------------
    const realSopsAsReal = await withTenantClient(real.clerk_user_id, (c) =>
      c.query<{ id: string; org_id: string; sop_number: string | null }>(
        `select id, org_id, sop_number from sops`
      )
    );
    const realCount = realSopsAsReal.rows.length;
    const realSeesFake = realSopsAsReal.rows.some((r) => r.id === fakeSopId);
    const realSeesOnlyOwnOrg = realSopsAsReal.rows.every((r) => r.org_id === real.org_id);
    checks.push({
      name: `Real user (${real.org_name}) cannot see fake org's SOPs`,
      ok: !realSeesFake && realSeesOnlyOwnOrg,
      detail: `Saw ${realCount} SOPs, all in own org=${realSeesOnlyOwnOrg}, leaked fake=${realSeesFake}`,
    });

    // -------------------------------------------------------------------
    // CHECK 2: Fake user sees ONLY the fake org's SOP
    // -------------------------------------------------------------------
    const fakeSopsAsFake = await withTenantClient(fakeClerkId, (c) =>
      c.query<{ id: string; org_id: string }>(`select id, org_id from sops`)
    );
    const fakeOnlySeesOwn =
      fakeSopsAsFake.rows.length === 1 &&
      fakeSopsAsFake.rows[0].id === fakeSopId &&
      fakeSopsAsFake.rows[0].org_id === fakeOrgId;
    checks.push({
      name: 'Fake user sees only their own org\'s SOP',
      ok: fakeOnlySeesOwn,
      detail: `Saw ${fakeSopsAsFake.rows.length} SOPs (expected exactly 1 fake)`,
    });

    // -------------------------------------------------------------------
    // CHECK 3: With NO clerk_user_id session var, RLS returns nothing
    // -------------------------------------------------------------------
    const noUserSops = await withTenantClient(null, (c) =>
      c.query<{ id: string }>(`select id from sops`)
    );
    checks.push({
      name: 'Without auth context, RLS returns no SOPs',
      ok: noUserSops.rows.length === 0,
      detail: `Saw ${noUserSops.rows.length} SOPs (expected 0)`,
    });

    // -------------------------------------------------------------------
    // CHECK 4: Real user can't see fake org or its rooftops/members
    // -------------------------------------------------------------------
    const realOrgs = await withTenantClient(real.clerk_user_id, (c) =>
      c.query<{ id: string }>(`select id from organizations`)
    );
    const seesFakeOrg = realOrgs.rows.some((r) => r.id === fakeOrgId);
    checks.push({
      name: 'Real user cannot enumerate fake organization',
      ok: !seesFakeOrg,
      detail: `Saw ${realOrgs.rows.length} orgs, leaked fake=${seesFakeOrg}`,
    });

    const realRooftops = await withTenantClient(real.clerk_user_id, (c) =>
      c.query<{ id: string }>(`select id from rooftops`)
    );
    const seesFakeRooftop = realRooftops.rows.some((r) => r.id === fakeRooftopId);
    checks.push({
      name: 'Real user cannot see fake rooftop',
      ok: !seesFakeRooftop,
      detail: `Saw ${realRooftops.rows.length} rooftops, leaked fake=${seesFakeRooftop}`,
    });

    // -------------------------------------------------------------------
    // CHECK 5: Real user cannot UPDATE the fake SOP via RLS
    // -------------------------------------------------------------------
    const realUpdateAttempt = await withTenantClient(real.clerk_user_id, (c) =>
      c.query(`update sops set notes = 'PWNED' where id = $1`, [fakeSopId])
    );
    checks.push({
      name: 'Real user cannot UPDATE fake org\'s SOPs',
      ok: realUpdateAttempt.rowCount === 0,
      detail: `Update affected ${realUpdateAttempt.rowCount} rows (expected 0)`,
    });

    // -------------------------------------------------------------------
    // CHECK 6: Real user cannot INSERT a SOP into the fake org
    // -------------------------------------------------------------------
    let realInsertBlocked = false;
    let realInsertDetail = '';
    try {
      await withTenantClient(real.clerk_user_id, (c) =>
        c.query(
          `insert into sops (org_id, rooftop_id, ro_number, sop_number, part_description, customer_name)
           values ($1, $2, 'RO-PWN', 'SOP-PWN', 'pwn', 'pwn')`,
          [fakeOrgId, fakeRooftopId]
        )
      );
      realInsertDetail = 'INSERT succeeded (LEAK!)';
    } catch (err) {
      realInsertBlocked = true;
      realInsertDetail = `Blocked: ${(err as Error).message.slice(0, 120)}`;
    }
    checks.push({
      name: 'Real user cannot INSERT a SOP into fake org',
      ok: realInsertBlocked,
      detail: realInsertDetail,
    });
  } finally {
    // Cleanup — even if checks errored
    if (fakeOrgId) {
      try { await query(`delete from organizations where id = $1`, [fakeOrgId]); } catch { /* ignore */ }
    }
    if (fakeUserId) {
      try { await query(`delete from users where id = $1`, [fakeUserId]); } catch { /* ignore */ }
    }
  }

  const allOk = checks.every((c) => c.ok);
  return NextResponse.json(
    {
      verdict: allOk ? 'PASS — multi-tenant isolation confirmed' : 'FAIL — see failed checks',
      passed: checks.filter((c) => c.ok).length,
      total: checks.length,
      checks,
    },
    { status: allOk ? 200 : 500 }
  );
}
