import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSuperAdmin, SuperAdminUnauthorized } from '@/lib/super-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type OrgListRow = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  groupme_configured: boolean;
  member_count: number;
  rooftop_count: number;
  total_sops: number;
  open_sops: number;
  last_sop_activity: string | null;
};

export async function GET() {
  try {
    await requireSuperAdmin();
  } catch (err) {
    if (err instanceof SuperAdminUnauthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    throw err;
  }

  const { rows } = await query<OrgListRow & { member_count: string; rooftop_count: string; total_sops: string; open_sops: string }>(
    `select
       o.id, o.name, o.slug, o.created_at,
       (o.groupme_bot_id is not null and length(o.groupme_bot_id) > 0) as groupme_configured,
       (select count(*) from org_members m where m.org_id = o.id)::text as member_count,
       (select count(*) from rooftops r where r.org_id = o.id)::text as rooftop_count,
       (select count(*) from sops s where s.org_id = o.id)::text as total_sops,
       (select count(*) from sops s where s.org_id = o.id and s.status not in ('complete','returned'))::text as open_sops,
       (select max(updated_at) from sops s where s.org_id = o.id) as last_sop_activity
     from organizations o
     order by o.created_at desc`
  );

  // Convert text counts to numbers
  const orgs: OrgListRow[] = rows.map((r) => ({
    ...r,
    member_count: Number(r.member_count),
    rooftop_count: Number(r.rooftop_count),
    total_sops: Number(r.total_sops),
    open_sops: Number(r.open_sops),
  }));

  return NextResponse.json({ orgs });
}
