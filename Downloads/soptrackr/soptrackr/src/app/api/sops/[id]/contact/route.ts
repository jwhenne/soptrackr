import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { withTenantClient } from '@/lib/db';
import { getCurrentDbUser, getCurrentUserOrgs } from '@/lib/auth';
import type { ContactLogRow } from '@/lib/sops';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ContactPayload = {
  method?: string;
  outcome?: string;
  note?: string;
};

const ALLOWED_METHODS = ['phone', 'voicemail', 'email', 'sms', 'in_person', 'other'];
const ALLOWED_OUTCOMES = ['spoke', 'left_voicemail', 'no_answer', 'scheduled', 'declined', 'wrong_number', 'other'];

// POST /api/sops/:id/contact — log a BDC contact attempt
export async function POST(request: Request, ctx: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await getCurrentDbUser();
  if (!dbUser) return NextResponse.json({ error: 'User sync failed' }, { status: 500 });

  const orgs = await getCurrentUserOrgs();
  if (orgs.length === 0) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const { id } = ctx.params;
  let payload: ContactPayload;
  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const method = payload.method?.trim();
  const outcome = payload.outcome?.trim();
  const note = payload.note?.trim() || null;

  if (!method || !ALLOWED_METHODS.includes(method)) {
    return NextResponse.json(
      { error: `Method must be one of: ${ALLOWED_METHODS.join(', ')}` },
      { status: 400 }
    );
  }
  if (!outcome || !ALLOWED_OUTCOMES.includes(outcome)) {
    return NextResponse.json(
      { error: `Outcome must be one of: ${ALLOWED_OUTCOMES.join(', ')}` },
      { status: 400 }
    );
  }

  const repName =
    [dbUser.first_name, dbUser.last_name].filter(Boolean).join(' ').trim() ||
    dbUser.email.split('@')[0];

  try {
    const entry = await withTenantClient(userId, async (client) => {
      // Find the sop's org_id (RLS will block if not in our org)
      const sopRes = await client.query<{ org_id: string }>(
        `select org_id from sops where id = $1 limit 1`,
        [id]
      );
      if (sopRes.rowCount === 0) throw new Error('Not found');

      const insertRes = await client.query<ContactLogRow>(
        `insert into sop_contact_log
           (sop_id, org_id, contacted_by_user_id, contacted_by_name, method, outcome, note)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning id, sop_id, contacted_by_name, method, outcome, note, contacted_at`,
        [id, sopRes.rows[0].org_id, dbUser.id, repName, method, outcome, note]
      );

      return insertRes.rows[0];
    });

    return NextResponse.json({ ok: true, entry });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message === 'Not found' ? 404 : 500;
    console.error('[sops.contact] failed:', message);
    return NextResponse.json({ error: message }, { status });
  }
}
