import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';

type DemoPayload = {
  name?: string;
  title?: string;
  dealership?: string;
  email?: string;
  phone?: string;
  rooftops?: string;
  notes?: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request: Request) {
  let payload: DemoPayload;
  try {
    payload = (await request.json()) as DemoPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = payload.name?.trim();
  const dealership = payload.dealership?.trim();
  const email = payload.email?.trim();

  if (!name || !dealership || !email) {
    return NextResponse.json(
      { error: 'Name, dealership, and email are required.' },
      { status: 400 }
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.DEMO_TO || 'sales@soptrackr.com';
  const from = process.env.MAIL_FROM || 'onboarding@resend.dev';

  if (!apiKey) {
    console.error('[demo-request] RESEND_API_KEY missing — falling back to log');
    console.log('[demo-request]', { receivedAt: new Date().toISOString(), ...payload });
    return NextResponse.json({ ok: true });
  }

  const resend = new Resend(apiKey);
  const fields: Array<[string, string | undefined]> = [
    ['Name', payload.name],
    ['Title', payload.title],
    ['Dealership', payload.dealership],
    ['Email', payload.email],
    ['Phone', payload.phone],
    ['Rooftops', payload.rooftops],
    ['Notes', payload.notes],
  ];

  const html = `
    <h2>New SOPTrackr demo request</h2>
    <table cellpadding="6" style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:14px;">
      ${fields
        .filter(([, v]) => v && v.trim())
        .map(
          ([k, v]) =>
            `<tr><td style="background:#f3f4f6;font-weight:600;">${k}</td><td>${escapeHtml(v as string)}</td></tr>`
        )
        .join('')}
    </table>
    <p style="color:#6b7280;font-size:12px;margin-top:16px;">Submitted at ${new Date().toISOString()}</p>
  `;

  const text = fields
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  try {
    const result = await resend.emails.send({
      from: `SOPTrackr Demo Form <${from}>`,
      to,
      replyTo: email,
      subject: `Demo request: ${dealership} (${name})`,
      html,
      text,
    });

    if (result.error) {
      console.error('[demo-request] Resend error:', result.error);
      return NextResponse.json(
        { error: 'Could not send your request. Please email sales@soptrackr.com directly.' },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('[demo-request] send failed:', err);
    return NextResponse.json(
      { error: 'Could not send your request. Please email sales@soptrackr.com directly.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
