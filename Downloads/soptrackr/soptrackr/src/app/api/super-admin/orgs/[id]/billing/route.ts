import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logSuperAdminAction, requireSuperAdmin, SuperAdminUnauthorized } from '@/lib/super-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_STATUSES = ['pending', 'active', 'past_due', 'suspended', 'cancelled'] as const;
type Status = (typeof VALID_STATUSES)[number];

function isStatus(s: unknown): s is Status {
  return typeof s === 'string' && (VALID_STATUSES as readonly string[]).includes(s);
}

type BillingPayload = {
  subscription_status?: string;
  monthly_rate_cents?: number;
  annual_contract?: boolean;
  setup_fee_waived?: boolean;
  current_period_end?: string | null;  // YYYY-MM-DD
  billing_notes?: string | null;
  // Convenience action: "mark active and extend period"
  extend_period_days?: number;
};

export async function PATCH(request: Request, ctx: { params: { id: string } }) {
  let admin;
  try {
    admin = await requireSuperAdmin();
  } catch (err) {
    if (err instanceof SuperAdminUnauthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    throw err;
  }

  const orgId = ctx.params.id;
  let payload: BillingPayload;
  try { payload = (await request.json()) as BillingPayload; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const sets: string[] = [];
  const params: unknown[] = [];

  if (payload.subscription_status !== undefined) {
    if (!isStatus(payload.subscription_status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }
    params.push(payload.subscription_status);
    sets.push(`subscription_status = $${params.length}`);

    // If we're activating a previously-non-active org, set subscription_started_at
    if (payload.subscription_status === 'active') {
      sets.push(`subscription_started_at = coalesce(subscription_started_at, now())`);
    }
  }

  if (payload.monthly_rate_cents !== undefined) {
    if (typeof payload.monthly_rate_cents !== 'number' || payload.monthly_rate_cents < 0) {
      return NextResponse.json({ error: 'monthly_rate_cents must be a non-negative integer' }, { status: 400 });
    }
    params.push(Math.round(payload.monthly_rate_cents));
    sets.push(`monthly_rate_cents = $${params.length}`);
  }

  if (payload.annual_contract !== undefined) {
    params.push(!!payload.annual_contract);
    sets.push(`annual_contract = $${params.length}`);
  }

  if (payload.setup_fee_waived !== undefined) {
    params.push(!!payload.setup_fee_waived);
    sets.push(`setup_fee_waived = $${params.length}`);
  }

  if (payload.current_period_end !== undefined) {
    if (payload.current_period_end === null || payload.current_period_end === '') {
      sets.push(`current_period_end = null`);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(payload.current_period_end)) {
      params.push(payload.current_period_end);
      sets.push(`current_period_end = $${params.length}`);
    } else {
      return NextResponse.json({ error: 'current_period_end must be YYYY-MM-DD' }, { status: 400 });
    }
  }

  if (payload.billing_notes !== undefined) {
    if (payload.billing_notes === null || payload.billing_notes === '') {
      sets.push(`billing_notes = null`);
    } else {
      params.push(payload.billing_notes);
      sets.push(`billing_notes = $${params.length}`);
    }
  }

  // Convenience: extend period from today by N days
  if (payload.extend_period_days !== undefined) {
    if (typeof payload.extend_period_days !== 'number' || payload.extend_period_days <= 0) {
      return NextResponse.json({ error: 'extend_period_days must be a positive integer' }, { status: 400 });
    }
    params.push(payload.extend_period_days);
    sets.push(`current_period_end = (current_date + ($${params.length}::int) * interval '1 day')::date`);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  params.push(orgId);
  const idParam = `$${params.length}`;

  try {
    const { rows, rowCount } = await query<{
      id: string;
      subscription_status: Status;
      monthly_rate_cents: number;
      annual_contract: boolean;
      setup_fee_waived: boolean;
      subscription_started_at: string | null;
      current_period_end: string | null;
      billing_notes: string | null;
    }>(
      `update organizations set ${sets.join(', ')}
       where id = ${idParam}
       returning id, subscription_status, monthly_rate_cents, annual_contract,
                 setup_fee_waived, subscription_started_at, current_period_end, billing_notes`,
      params
    );
    if (!rowCount) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

    void logSuperAdminAction(admin, 'edit_billing', {
      orgId,
      details: { changes: payload },
    });

    return NextResponse.json({ ok: true, billing: rows[0] });
  } catch (err) {
    console.error('[super-admin.billing] failed:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
