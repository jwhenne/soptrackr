import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { withTenantClient } from '@/lib/db';
import { getCurrentDbUser, getCurrentUserOrgs } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// DELETE /api/invitations/:id  → admin revokes a pending invite
export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await getCurrentDbUser();

  const orgs = await getCurrentUserOrgs();
  if (orgs.length === 0) return NextResponse.json({ error: 'No organization' }, { status: 400 });
  if (orgs[0].role !== 'admin' && orgs[0].role !== 'manager') {
    return NextResponse.json({ error: 'Admins/managers only' }, { status: 403 });
  }

  const { id } = ctx.params;
  try {
    const deleted = await withTenantClient(userId, async (client) => {
      const res = await client.query(`delete from invitations where id = $1`, [id]);
      return res.rowCount;
    });
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
