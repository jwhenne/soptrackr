import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { auth } from '@clerk/nextjs/server';
import { withTenantClient } from '@/lib/db';
import { getCurrentDbUser } from '@/lib/auth';

export const runtime = 'nodejs';

type CreateOrgPayload = {
  name?: string;
  rooftop_name?: string;
  rooftop_brand?: string;
  rooftop_city?: string;
  rooftop_state?: string;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbUser = await getCurrentDbUser();
  if (!dbUser) {
    return NextResponse.json({ error: 'User sync failed' }, { status: 500 });
  }

  let payload: CreateOrgPayload;
  try {
    payload = (await request.json()) as CreateOrgPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = payload.name?.trim();
  const rooftopName = payload.rooftop_name?.trim();
  const rooftopBrand = payload.rooftop_brand?.trim();
  const rooftopCity = payload.rooftop_city?.trim() || null;
  const rooftopState = payload.rooftop_state?.trim().toUpperCase().slice(0, 2) || null;

  if (!name) return NextResponse.json({ error: 'Dealership name is required' }, { status: 400 });
  if (!rooftopName) return NextResponse.json({ error: 'Rooftop name is required' }, { status: 400 });
  if (!rooftopBrand) return NextResponse.json({ error: 'Rooftop brand is required' }, { status: 400 });

  try {
    const result = await withTenantClient(userId, async (client) => {
      // Build a unique slug. Append a short suffix on collision.
      const baseSlug = slugify(name) || 'dealership';
      let slug = baseSlug;
      let attempt = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { rowCount } = await client.query('select 1 from organizations where slug = $1', [slug]);
        if (!rowCount) break;
        attempt += 1;
        slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
        if (attempt > 5) throw new Error('Could not generate a unique slug');
      }

      // RLS would normally block an insert here because the user is not yet a
      // member of any org. We bypass by running the insert as a SECURITY DEFINER
      // function would, or simply by creating the org + membership atomically
      // and trusting that the API has already verified the user identity.
      // For now we just elevate via SET LOCAL role = postgres on the client side
      // is overkill — since RLS policies on organizations only restrict SELECT
      // and UPDATE (not INSERT), the insert below will succeed.

      const orgRes = await client.query<{ id: string }>(
        `insert into organizations (name, slug, created_by)
         values ($1, $2, $3)
         returning id`,
        [name, slug, dbUser.id]
      );
      const orgId = orgRes.rows[0].id;

      await client.query(
        `insert into org_members (org_id, user_id, role)
         values ($1, $2, 'admin')`,
        [orgId, dbUser.id]
      );

      const rooftopRes = await client.query<{ id: string }>(
        `insert into rooftops (org_id, name, brand, city, state)
         values ($1, $2, $3, $4, $5)
         returning id`,
        [orgId, rooftopName, rooftopBrand, rooftopCity, rooftopState]
      );

      return { orgId, slug, rooftopId: rooftopRes.rows[0].id };
    });

    // Fire-and-forget signup notification email so the super admin knows to
    // open a QBO invoice for this dealer. Errors are logged, never thrown.
    void sendSignupNotification({
      orgName: name,
      orgId: result.orgId,
      slug: result.slug,
      rooftopName,
      rooftopBrand,
      rooftopCity,
      rooftopState,
      contactName: [dbUser.first_name, dbUser.last_name].filter(Boolean).join(' ') || dbUser.email,
      contactEmail: dbUser.email,
    }).catch((e) => console.error('[orgs.create] signup email failed:', e));

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[orgs.create] failed:', message);
    return NextResponse.json(
      { error: `Could not create organization: ${message}` },
      { status: 500 }
    );
  }
}

async function sendSignupNotification(p: {
  orgName: string;
  orgId: string;
  slug: string;
  rooftopName: string;
  rooftopBrand: string;
  rooftopCity: string | null;
  rooftopState: string | null;
  contactName: string;
  contactEmail: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // Silently skip in environments without email
  const to = process.env.DEMO_TO || 'sales@soptrackr.com';
  const from = process.env.MAIL_FROM || 'onboarding@resend.dev';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://soptrackr.com';
  const adminLink = `${baseUrl}/admin/orgs/${p.orgId}`;
  const location = [p.rooftopCity, p.rooftopState].filter(Boolean).join(', ') || '—';

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: `SOPTrackr Signups <${from}>`,
    to,
    subject: `New signup: ${p.orgName} (${p.rooftopBrand})`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <h2 style="color:#0B1B3A;margin:0 0 16px;">🎉 New SOPTrackr signup</h2>
        <table cellpadding="6" style="border-collapse:collapse;font-size:14px;">
          <tr><td style="background:#f3f4f6;font-weight:600;">Organization</td><td>${esc(p.orgName)}</td></tr>
          <tr><td style="background:#f3f4f6;font-weight:600;">First rooftop</td><td>${esc(p.rooftopName)} (${esc(p.rooftopBrand)})</td></tr>
          <tr><td style="background:#f3f4f6;font-weight:600;">Location</td><td>${esc(location)}</td></tr>
          <tr><td style="background:#f3f4f6;font-weight:600;">Signed up by</td><td>${esc(p.contactName)} &lt;${esc(p.contactEmail)}&gt;</td></tr>
        </table>
        <p style="color:#374151;font-size:14px;margin-top:16px;">
          Their account is set to <strong>pending</strong> — they can&rsquo;t access /app yet.
          Set them up in QuickBooks, send the first invoice, then activate them.
        </p>
        <p style="margin:20px 0;">
          <a href="${adminLink}" style="display:inline-block;padding:10px 18px;background:#1E40AF;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
            Open in admin
          </a>
        </p>
      </div>
    `,
    text:
      `New SOPTrackr signup\n\n` +
      `Organization: ${p.orgName}\n` +
      `First rooftop: ${p.rooftopName} (${p.rooftopBrand})\n` +
      `Location: ${location}\n` +
      `Signed up by: ${p.contactName} <${p.contactEmail}>\n\n` +
      `Status: pending. Set them up in QBO, send first invoice, then activate at:\n${adminLink}`,
  });
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
