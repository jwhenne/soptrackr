import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { withTenantClient } from '@/lib/db';
import { getCurrentDbUser, getCurrentUserOrgs } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type OrgSettings = {
  id: string;
  name: string;
  slug: string;
  groupme_bot_id: string | null;
  groupme_group_name: string | null;
};

// GET /api/org/settings  → returns the current org's settings (members can read)
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await getCurrentDbUser();

  const orgs = await getCurrentUserOrgs();
  if (orgs.length === 0) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const settings = await withTenantClient(userId, async (client) => {
    const { rows } = await client.query<OrgSettings>(
      `select id, name, slug, groupme_bot_id, groupme_group_name
       from organizations where id = $1`,
      [orgs[0].org_id]
    );
    return rows[0] || null;
  });
  if (!settings) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ settings });
}

type UpdatePayload = {
  name?: string;
  groupme_bot_id?: string | null;
  groupme_group_name?: string | null;
};

// PATCH /api/org/settings  → admin-only update of org settings
export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await getCurrentDbUser();

  const orgs = await getCurrentUserOrgs();
  if (orgs.length === 0) return NextResponse.json({ error: 'No organization' }, { status: 400 });
  if (orgs[0].role !== 'admin' && orgs[0].role !== 'manager') {
    return NextResponse.json({ error: 'Admins/managers only' }, { status: 403 });
  }

  let payload: UpdatePayload;
  try { payload = (await request.json()) as UpdatePayload; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const sets: string[] = [];
  const params: unknown[] = [];

  if (payload.name !== undefined) {
    const v = payload.name?.trim();
    if (!v) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    params.push(v); sets.push(`name = $${params.length}`);
  }
  if (payload.groupme_bot_id !== undefined) {
    const v = payload.groupme_bot_id?.trim() || null;
    params.push(v); sets.push(`groupme_bot_id = $${params.length}`);
  }
  if (payload.groupme_group_name !== undefined) {
    const v = payload.groupme_group_name?.trim() || null;
    params.push(v); sets.push(`groupme_group_name = $${params.length}`);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  params.push(orgs[0].org_id);
  const idParam = `$${params.length}`;

  try {
    const settings = await withTenantClient(userId, async (client) => {
      const { rows } = await client.query<OrgSettings>(
        `update organizations set ${sets.join(', ')} where id = ${idParam}
         returning id, name, slug, groupme_bot_id, groupme_group_name`,
        params
      );
      return rows[0];
    });
    if (!settings) return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
