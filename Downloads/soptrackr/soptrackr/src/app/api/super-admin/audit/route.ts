import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireSuperAdmin, SuperAdminUnauthorized } from '@/lib/super-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type AuditEntry = {
  id: string;
  super_admin_name: string;
  action: string;
  target_org_id: string | null;
  target_org_name: string | null;
  target_resource: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();
  } catch (err) {
    if (err instanceof SuperAdminUnauthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    throw err;
  }

  const url = new URL(request.url);
  const orgId = url.searchParams.get('org_id');
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '100', 10), 1), 500);

  const params: unknown[] = [];
  let where = '';
  if (orgId) {
    params.push(orgId);
    where = `where a.target_org_id = $${params.length}`;
  }
  params.push(limit);

  const { rows } = await query<AuditEntry>(
    `select a.id,
            coalesce(u.first_name || ' ' || u.last_name, u.email, 'unknown') as super_admin_name,
            a.action, a.target_org_id, o.name as target_org_name,
            a.target_resource, a.details, a.created_at
     from super_admin_actions a
     left join users u on u.id = a.super_admin_user_id
     left join organizations o on o.id = a.target_org_id
     ${where}
     order by a.created_at desc
     limit $${params.length}`,
    params
  );

  return NextResponse.json({ entries: rows });
}
