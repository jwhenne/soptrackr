import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logSuperAdminAction, requireSuperAdmin, SuperAdminUnauthorized } from '@/lib/super-admin';
import type { SopRow } from '@/lib/sops';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  let admin;
  try {
    admin = await requireSuperAdmin();
  } catch (err) {
    if (err instanceof SuperAdminUnauthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    throw err;
  }

  const orgId = ctx.params.id;

  const orgRes = await query<{
    id: string; name: string; slug: string; created_at: string; updated_at: string;
    groupme_bot_id: string | null; groupme_group_name: string | null;
    subscription_status: string;
    monthly_rate_cents: number;
    annual_contract: boolean;
    setup_fee_waived: boolean;
    subscription_started_at: string | null;
    current_period_end: string | null;
    billing_notes: string | null;
  }>(
    `select id, name, slug, created_at, updated_at,
            groupme_bot_id, groupme_group_name,
            subscription_status, monthly_rate_cents, annual_contract,
            setup_fee_waived, subscription_started_at, current_period_end, billing_notes
     from organizations where id = $1`,
    [orgId]
  );
  if (orgRes.rows.length === 0) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }
  const org = orgRes.rows[0];

  const [members, rooftops, sops, invitations, statusCounts] = await Promise.all([
    query<{
      user_id: string; email: string; first_name: string | null; last_name: string | null;
      role: string; joined_at: string;
    }>(
      `select u.id as user_id, u.email, u.first_name, u.last_name, m.role, m.created_at as joined_at
       from org_members m join users u on u.id = m.user_id
       where m.org_id = $1 order by m.created_at`,
      [orgId]
    ),
    query<{ id: string; name: string; brand: string | null; city: string | null; state: string | null; created_at: string }>(
      `select id, name, brand, city, state, created_at from rooftops where org_id = $1 order by name`,
      [orgId]
    ),
    query<SopRow>(
      `select * from sops_with_age where org_id = $1
       order by case when status in ('complete','returned') then 1 else 0 end,
                coalesce(arrived_at, ordered_at) desc
       limit 200`,
      [orgId]
    ),
    query<{
      id: string; email: string; role: string; token: string;
      accepted_at: string | null; expires_at: string; created_at: string;
    }>(
      `select id, email, role, token, accepted_at, expires_at, created_at
       from invitations where org_id = $1 order by created_at desc limit 50`,
      [orgId]
    ),
    query<{ status: string; count: string }>(
      `select status, count(*)::text as count from sops where org_id = $1 group by status`,
      [orgId]
    ),
  ]);

  const totals: Record<string, number> = {};
  for (const r of statusCounts.rows) totals[r.status] = Number(r.count);

  // Audit
  void logSuperAdminAction(admin, 'view_org', { orgId });

  return NextResponse.json({
    org,
    members: members.rows,
    rooftops: rooftops.rows,
    sops: sops.rows,
    invitations: invitations.rows,
    sopTotals: totals,
  });
}
