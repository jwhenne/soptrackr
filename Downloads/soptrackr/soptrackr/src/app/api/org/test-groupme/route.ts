import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { withTenantClient } from '@/lib/db';
import { getCurrentDbUser, getCurrentUserOrgs } from '@/lib/auth';
import { postToGroupMe } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TestPayload = { bot_id?: string };

// POST /api/org/test-groupme  → admin sends a test message to the GroupMe bot
// Accepts an explicit bot_id in the body (so admins can test before saving),
// or falls back to the org's stored bot_id.
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await getCurrentDbUser();
  if (!dbUser) return NextResponse.json({ error: 'User sync failed' }, { status: 500 });

  const orgs = await getCurrentUserOrgs();
  if (orgs.length === 0) return NextResponse.json({ error: 'No organization' }, { status: 400 });
  if (orgs[0].role !== 'admin' && orgs[0].role !== 'manager') {
    return NextResponse.json({ error: 'Admins/managers only' }, { status: 403 });
  }

  let payload: TestPayload;
  try { payload = (await request.json().catch(() => ({}))) as TestPayload; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  let botId = payload.bot_id?.trim();

  if (!botId) {
    botId = (await withTenantClient(userId, async (client) => {
      const { rows } = await client.query<{ groupme_bot_id: string | null }>(
        `select groupme_bot_id from organizations where id = $1`, [orgs[0].org_id]
      );
      return rows[0]?.groupme_bot_id || undefined;
    })) || undefined;
  }

  if (!botId) {
    return NextResponse.json({ error: 'No GroupMe bot ID configured' }, { status: 400 });
  }

  const tester = [dbUser.first_name, dbUser.last_name].filter(Boolean).join(' ') || dbUser.email;
  const text =
    `[SOPTrackr Test] ${tester} fired a test message from ${orgs[0].org_name}. ` +
    `If you see this in your GroupMe, the integration is working. ` +
    `From now on, you'll get arrival + return notifications here automatically.`;

  const result = await postToGroupMe(botId, text);
  if (!result.ok) {
    return NextResponse.json(
      { error: `GroupMe rejected the message: ${result.error || 'HTTP ' + result.status}. Double-check the bot ID.` },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
