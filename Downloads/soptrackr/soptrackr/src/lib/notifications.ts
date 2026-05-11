// GroupMe notification dispatcher.
//
// Each org configures one bot_id (organizations.groupme_bot_id). On key SOP
// events, we POST to https://api.groupme.com/v3/bots/post — no auth headers,
// just JSON {bot_id, text}. Errors are logged but never throw — notifications
// must not break the SOP update flow.

import https from 'https';
import type { SopRow } from './sops';

export type SopForNotify = Pick<
  SopRow,
  | 'ro_number'
  | 'sop_number'
  | 'part_number'
  | 'part_description'
  | 'customer_name'
  | 'customer_phone'
  | 'customer_email'
  | 'vehicle'
  | 'vehicle_staying'
  | 'advisor'
  | 'notes'
  | 'days_since_arrived'
>;

export type RooftopForNotify = { name: string; brand: string | null };

/** Fire-and-log GroupMe post. Never throws. */
export async function postToGroupMe(botId: string, text: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (!botId || !text) return { ok: false, error: 'Missing botId or text' };

  const payload = JSON.stringify({ bot_id: botId, text });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.groupme.com',
        path: '/v3/bots/post',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 8000,
      },
      (res) => {
        // Drain to free the socket
        res.resume();
        const ok = (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300;
        resolve({ ok, status: res.statusCode });
      }
    );
    req.on('error', (err) => {
      console.error('[groupme] post failed:', err.message);
      resolve({ ok: false, error: err.message });
    });
    req.on('timeout', () => {
      req.destroy();
      console.error('[groupme] post timeout');
      resolve({ ok: false, error: 'timeout' });
    });
    req.write(payload);
    req.end();
  });
}

const stayingLabel = (v: boolean | null) =>
  v === true ? 'Yes' : v === false ? 'No' : 'Not specified';

export function buildArrivalMessage(sop: SopForNotify, rooftop?: RooftopForNotify): string {
  const lines: Array<string | null> = [
    '** PART ARRIVED - ACTION REQUIRED **',
    rooftop ? `Rooftop: ${rooftop.name}` : null,
    sop.sop_number ? `SOP: ${sop.sop_number}` : null,
    `RO: ${sop.ro_number}`,
    `Part: ${sop.part_description}`,
    sop.part_number ? `Part #: ${sop.part_number}` : null,
    `Customer: ${sop.customer_name}`,
    sop.customer_phone ? `Phone: ${sop.customer_phone}` : null,
    sop.customer_email ? `Email: ${sop.customer_email}` : null,
    sop.vehicle ? `Vehicle: ${sop.vehicle}` : null,
    `Vehicle staying: ${stayingLabel(sop.vehicle_staying)}`,
    sop.advisor ? `Advisor: ${sop.advisor}` : null,
    sop.notes ? `Notes: ${sop.notes}` : null,
    '',
    'Please contact customer to schedule install appointment.',
  ];
  return lines.filter((l): l is string => l !== null).join('\n');
}

export function buildReturnMessage(sop: SopForNotify, rooftop?: RooftopForNotify): string {
  const days = sop.days_since_arrived ?? 0;
  const lines: Array<string | null> = [
    '** PART RETURN NOTICE **',
    rooftop ? `Rooftop: ${rooftop.name}` : null,
    sop.sop_number ? `SOP: ${sop.sop_number}` : null,
    `RO: ${sop.ro_number}`,
    `Part: ${sop.part_description}`,
    sop.part_number ? `Part #: ${sop.part_number}` : null,
    `Customer: ${sop.customer_name}`,
    sop.customer_phone ? `Phone: ${sop.customer_phone}` : null,
    sop.vehicle ? `Vehicle: ${sop.vehicle}` : null,
    `Days since arrival: ${days}`,
    sop.advisor ? `Advisor: ${sop.advisor}` : null,
    '',
    'Customer will NOT be coming in for install. Please initiate part return process.',
  ];
  return lines.filter((l): l is string => l !== null).join('\n');
}
