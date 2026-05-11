import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';
import { getCurrentDbUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AcceptPayload = { token?: string };

// POST /api/invitations/accept  → signed-in user accepts a token
// Uses accept_invitation() SECURITY DEFINER function to bypass RLS atomically.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Sign in to accept your invite' }, { status: 401 });

  // Trigger lazy-sync so the user row exists before we try to add an org_member
  await getCurrentDbUser();

  let payload: AcceptPayload;
  try { payload = (await request.json()) as AcceptPayload; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const token = payload.token?.trim();
  if (!token) return NextResponse.json({ error: 'Token is required' }, { status: 400 });

  try {
    const { rows } = await query<{
      is_ok: boolean;
      joined_org_id: string | null;
      assigned_role: string | null;
      result_message: string;
    }>(`select * from accept_invitation($1, $2)`, [token, userId]);

    const result = rows[0];
    if (!result?.is_ok) {
      return NextResponse.json(
        { error: result?.result_message || 'Could not accept invitation', orgId: result?.joined_org_id },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      orgId: result.joined_org_id,
      role: result.assigned_role,
      message: result.result_message,
    });
  } catch (err) {
    console.error('[invitations.accept] failed:', err);
    return NextResponse.json({ error: 'Accept failed' }, { status: 500 });
  }
}
