import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSuperAdmin, SuperAdminUnauthorized } from '@/lib/super-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireSuperAdmin();
  } catch (err) {
    if (err instanceof SuperAdminUnauthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    throw err;
  }

  const [orgs, users, rooftops, sopsByStatus, recentSignups, activeOrgs7d, pendingInvites] = await Promise.all([
    query<{ count: string }>(`select count(*)::text as count from organizations`),
    query<{ count: string }>(`select count(*)::text as count from users`),
    query<{ count: string }>(`select count(*)::text as count from rooftops`),
    query<{ status: string; count: string }>(
      `select status, count(*)::text as count from sops group by status`
    ),
    query<{ count: string }>(
      `select count(*)::text as count from organizations where created_at > now() - interval '30 days'`
    ),
    query<{ count: string }>(
      `select count(distinct s.org_id)::text as count
       from sops s where s.updated_at > now() - interval '7 days'`
    ),
    query<{ count: string }>(
      `select count(*)::text as count from invitations where accepted_at is null and expires_at > now()`
    ),
  ]);

  const sopTotals: Record<string, number> = {};
  for (const r of sopsByStatus.rows) sopTotals[r.status] = Number(r.count);
  const totalSops = Object.values(sopTotals).reduce((a, b) => a + b, 0);
  const openSops = totalSops - (sopTotals.complete ?? 0) - (sopTotals.returned ?? 0);

  return NextResponse.json({
    totals: {
      organizations: Number(orgs.rows[0].count),
      users: Number(users.rows[0].count),
      rooftops: Number(rooftops.rows[0].count),
      sops: totalSops,
      openSops,
      pendingInvitations: Number(pendingInvites.rows[0].count),
    },
    sopsByStatus: sopTotals,
    activity: {
      newOrgs30d: Number(recentSignups.rows[0].count),
      activeOrgs7d: Number(activeOrgs7d.rows[0].count),
    },
  });
}
