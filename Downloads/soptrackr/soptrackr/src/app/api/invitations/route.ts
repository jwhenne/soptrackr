import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { auth } from '@clerk/nextjs/server';
import { withTenantClient } from '@/lib/db';
import { getCurrentDbUser, getCurrentUserOrgs } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_ROLES = ['admin', 'manager', 'parts_consultant', 'service_advisor', 'technician'] as const;
type Role = (typeof VALID_ROLES)[number];

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  manager: 'Manager',
  parts_consultant: 'Parts Consultant',
  service_advisor: 'Service Advisor',
  technician: 'Technician',
};

function isRole(s: unknown): s is Role {
  return typeof s === 'string' && (VALID_ROLES as readonly string[]).includes(s);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type InviteRow = {
  id: string;
  email: string;
  role: Role;
  invited_by_name: string | null;
  token: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
};

// GET /api/invitations  → admin-only list of pending invites for current org
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await getCurrentDbUser();

  const orgs = await getCurrentUserOrgs();
  if (orgs.length === 0) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const invitations = await withTenantClient(userId, async (client) => {
    const { rows } = await client.query<InviteRow>(
      `select i.id, i.email, i.role,
              coalesce(u.first_name || ' ' || u.last_name, u.email) as invited_by_name,
              i.token, i.accepted_at, i.expires_at, i.created_at
       from invitations i
       left join users u on u.id = i.invited_by
       where i.org_id = $1
         and i.accepted_at is null
       order by i.created_at desc`,
      [orgs[0].org_id]
    );
    return rows;
  });

  return NextResponse.json({ invitations });
}

type CreateInvitePayload = { email?: string; role?: string };

// POST /api/invitations  → admin sends a new invite (creates row + emails the link)
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await getCurrentDbUser();
  if (!dbUser) return NextResponse.json({ error: 'User sync failed' }, { status: 500 });

  const orgs = await getCurrentUserOrgs();
  if (orgs.length === 0) return NextResponse.json({ error: 'No organization' }, { status: 400 });
  const org = orgs[0];

  if (org.role !== 'admin' && org.role !== 'manager') {
    return NextResponse.json({ error: 'Only admins and managers can invite teammates' }, { status: 403 });
  }

  let payload: CreateInvitePayload;
  try { payload = (await request.json()) as CreateInvitePayload; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const email = payload.email?.trim().toLowerCase();
  const role = payload.role;
  if (!email || !isValidEmail(email)) return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  if (!isRole(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });

  let invite: InviteRow;
  try {
    invite = await withTenantClient(userId, async (client) => {
      // Check if user is already a member
      const { rowCount: alreadyMember } = await client.query(
        `select 1 from org_members m join users u on u.id = m.user_id
         where m.org_id = $1 and lower(u.email) = $2`,
        [org.org_id, email]
      );
      if (alreadyMember) throw new Error(`${email} is already a member`);

      // Cancel any existing pending invite for this email/org so we get a fresh token
      await client.query(
        `delete from invitations where org_id = $1 and lower(email) = $2 and accepted_at is null`,
        [org.org_id, email]
      );

      const { rows } = await client.query<InviteRow>(
        `insert into invitations (org_id, email, role, invited_by)
         values ($1, $2, $3, $4)
         returning id, email, role,
                   $5::text as invited_by_name,
                   token, accepted_at, expires_at, created_at`,
        [
          org.org_id, email, role, dbUser.id,
          [dbUser.first_name, dbUser.last_name].filter(Boolean).join(' ') || dbUser.email,
        ]
      );
      return rows[0];
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  // Send email (best effort — log error but don't fail the request)
  try {
    await sendInviteEmail({
      to: email,
      orgName: org.org_name,
      role: role as Role,
      token: invite.token,
      inviterName: [dbUser.first_name, dbUser.last_name].filter(Boolean).join(' ') || dbUser.email,
    });
  } catch (err) {
    console.error('[invitations.create] email send failed:', err);
    // We still return success — the admin can resend / share the link manually
  }

  return NextResponse.json({ ok: true, invitation: invite });
}

async function sendInviteEmail({ to, orgName, role, token, inviterName }: {
  to: string; orgName: string; role: Role; token: string; inviterName: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[invitations] RESEND_API_KEY missing — skipping email send');
    return;
  }
  const from = process.env.MAIL_FROM || 'onboarding@resend.dev';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://soptrackr.com';
  const link = `${baseUrl}/invite/${encodeURIComponent(token)}`;

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: `SOPTrackr <${from}>`,
    to,
    subject: `${inviterName} invited you to ${orgName} on SOPTrackr`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <h2 style="color:#0B1B3A;margin:0 0 16px;">You're invited to ${escape(orgName)}</h2>
        <p style="color:#374151;font-size:15px;line-height:1.5;">
          <strong>${escape(inviterName)}</strong> invited you to join
          <strong>${escape(orgName)}</strong> on SOPTrackr as a
          <strong>${ROLE_LABELS[role]}</strong>.
        </p>
        <p style="color:#374151;font-size:15px;line-height:1.5;">
          SOPTrackr is the special order parts tracking tool used by your dealership. Click below to accept and create your account.
        </p>
        <p style="margin:24px 0;">
          <a href="${link}" style="display:inline-block;padding:12px 22px;background:#1E40AF;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
            Accept invitation
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px;">
          Or paste this link in your browser:<br>
          <span style="color:#1E40AF;">${link}</span>
        </p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">
          This invite expires in 14 days. If you weren't expecting it, you can safely ignore this email.
        </p>
      </div>
    `,
    text:
      `${inviterName} invited you to join ${orgName} on SOPTrackr as a ${ROLE_LABELS[role]}.\n\n` +
      `Accept your invitation here:\n${link}\n\n(Expires in 14 days.)`,
  });
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
