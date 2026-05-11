import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';

type SupportPayload = {
  name?: string;
  dealership?: string;
  email?: string;
  subject?: string;
  message?: string;
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
  let payload: SupportPayload;
  try {
    payload = (await request.json()) as SupportPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = payload.name?.trim();
  const email = payload.email?.trim();
  const subject = payload.subject?.trim();
  const message = payload.message?.trim();

  if (!name || !email || !subject || !message) {
    return NextResponse.json(
      { error: 'Name, email, subject, and message are required.' },
      { status: 400 }
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.SUPPORT_TO || 'support@soptrackr.com';
  const from = process.env.MAIL_FROM || 'onboarding@resend.dev';

  if (!apiKey) {
    console.error('[support-request] RESEND_API_KEY missing — falling back to log');
    console.log('[support-request]', { receivedAt: new Date().toISOString(), ...payload });
    return NextResponse.json({ ok: true });
  }

  const resend = new Resend(apiKey);
  const fields: Array<[string, string | undefined]> = [
    ['Name', payload.name],
    ['Dealership', payload.dealership],
    ['Email', payload.email],
    ['Subject', payload.subject],
  ];

  const html = `
    <h2>New SOPTrackr support request</h2>
    <table cellpadding="6" style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:14px;margin-bottom:16px;">
      ${fields
        .filter(([, v]) => v && v.trim())
        .map(
          ([k, v]) =>
            `<tr><td style="background:#f3f4f6;font-weight:600;">${k}</td><td>${escapeHtml(v as string)}</td></tr>`
        )
        .join('')}
    </table>
    <div style="font-family:system-ui,sans-serif;font-size:14px;border-left:3px solid #1E40AF;padding-left:12px;white-space:pre-wrap;">${escapeHtml(message)}</div>
    <p style="color:#6b7280;font-size:12px;margin-top:16px;">Submitted at ${new Date().toISOString()}</p>
  `;

  const text =
    fields
      .filter(([, v]) => v && v.trim())
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n') + `\n\nMessage:\n${message}`;

  try {
    const result = await resend.emails.send({
      from: `SOPTrackr Support <${from}>`,
      to,
      replyTo: email,
      subject: `Support: ${subject} — ${name}`,
      html,
      text,
    });

    if (result.error) {
      console.error('[support-request] Resend error:', result.error);
      return NextResponse.json(
        { error: 'Could not send your request. Please email support@soptrackr.com directly.' },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('[support-request] send failed:', err);
    return NextResponse.json(
      { error: 'Could not send your request. Please email support@soptrackr.com directly.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
