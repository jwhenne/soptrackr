import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/invitations/by-token/:token  → public lookup (no auth)
// Uses the lookup_invitation_by_token() SECURITY DEFINER function to bypass RLS.
// Returns minimal info — no token echoed back, no member list, no SOPs.
export async function GET(_req: Request, ctx: { params: { token: string } }) {
  const { token } = ctx.params;
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  try {
    const { rows } = await query<{
      invitation_id: string;
      org_id: string;
      org_name: string;
      email: string;
      role: string;
      expires_at: string;
      accepted_at: string | null;
    }>(`select * from lookup_invitation_by_token($1)`, [token]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const inv = rows[0];
    if (inv.accepted_at) {
      return NextResponse.json({ status: 'accepted', orgName: inv.org_name }, { status: 410 });
    }
    if (new Date(inv.expires_at) < new Date()) {
      return NextResponse.json({ status: 'expired', orgName: inv.org_name }, { status: 410 });
    }

    return NextResponse.json({
      status: 'pending',
      orgName: inv.org_name,
      email: inv.email,
      role: inv.role,
      expiresAt: inv.expires_at,
    });
  } catch (err) {
    console.error('[invitations.lookup] failed:', err);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
