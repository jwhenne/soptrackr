import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { withTenantClient } from '@/lib/db';
import { getCurrentDbUser, getCurrentUserOrgs } from '@/lib/auth';
import {
  STATUS_TIMESTAMP_COLUMN,
  isSopStatus,
  type ContactLogRow,
  type SopRow,
  type StatusHistoryRow,
} from '@/lib/sops';
import { postToGroupMe, buildArrivalMessage, buildReturnMessage } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type UpdateSopPayload = {
  status?: string;
  ro_number?: string;
  sop_number?: string;
  part_number?: string;
  part_description?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  vehicle?: string;
  vehicle_staying?: boolean | 'yes' | 'no' | null;
  advisor?: string;
  notes?: string;
  eta?: string | null;
  backordered?: boolean;
  notified_to_bdc?: boolean;
  scheduled_at?: string | null;
  return_reason?: string;
  status_note?: string; // free-text note attached to the status_history row
};

// Fields that are safely updatable via PATCH (not status — that has its own flow)
const UPDATABLE_FIELDS = [
  'ro_number',
  'sop_number',
  'part_number',
  'part_description',
  'customer_name',
  'customer_phone',
  'customer_email',
  'vehicle',
  'vehicle_staying',
  'advisor',
  'notes',
  'eta',
  'backordered',
  'notified_to_bdc',
  'scheduled_at',
  'return_reason',
] as const;

// GET /api/sops/:id — single SOP with status history + contact log
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await getCurrentDbUser();

  const { id } = ctx.params;

  const result = await withTenantClient(userId, async (client) => {
    const sopRes = await client.query<SopRow>(
      `select * from sops_with_age where id = $1 limit 1`,
      [id]
    );
    if (sopRes.rowCount === 0) return null;

    const historyRes = await client.query<StatusHistoryRow>(
      `select id, sop_id, from_status, to_status, changed_by_user_id, changed_at, note
       from sop_status_history where sop_id = $1 order by changed_at asc`,
      [id]
    );

    const contactRes = await client.query<ContactLogRow>(
      `select id, sop_id, contacted_by_name, method, outcome, note, contacted_at
       from sop_contact_log where sop_id = $1 order by contacted_at desc`,
      [id]
    );

    return {
      sop: sopRes.rows[0],
      statusHistory: historyRes.rows,
      contactLog: contactRes.rows,
    };
  });

  if (!result) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(result);
}

// PATCH /api/sops/:id — update fields and/or status
export async function PATCH(request: Request, ctx: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await getCurrentDbUser();
  if (!dbUser) return NextResponse.json({ error: 'User sync failed' }, { status: 500 });

  const orgs = await getCurrentUserOrgs();
  if (orgs.length === 0) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const { id } = ctx.params;
  let payload: UpdateSopPayload;
  try {
    payload = (await request.json()) as UpdateSopPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const result = await withTenantClient(userId, async (client) => {
      // Load current state for status transition logic
      const currentRes = await client.query<{ status: string; org_id: string }>(
        `select status, org_id from sops where id = $1 limit 1`,
        [id]
      );
      if (currentRes.rowCount === 0) throw new Error('Not found');
      const current = currentRes.rows[0];

      // Build dynamic SET clause for normal field updates.
      // Track which columns are already in the SET so the status-transition
      // logic below doesn't double-assign (Postgres rejects
      // "multiple assignments to same column"). The most common collision is
      // status='scheduled' + scheduled_at=<user-picked date>, where the user's
      // date should win over the auto-now() fallback.
      const sets: string[] = [];
      const params: unknown[] = [];
      const includedColumns = new Set<string>();

      const normalizedVehicleStaying =
        payload.vehicle_staying === true || payload.vehicle_staying === 'yes' ? true :
        payload.vehicle_staying === false || payload.vehicle_staying === 'no' ? false :
        payload.vehicle_staying === null ? null : undefined;

      for (const field of UPDATABLE_FIELDS) {
        const raw = payload[field];
        if (raw === undefined) continue;
        let value: unknown = raw;
        if (field === 'vehicle_staying') {
          if (normalizedVehicleStaying === undefined) continue;
          value = normalizedVehicleStaying;
        } else if (typeof raw === 'string') {
          value = raw.trim() || null;
        }
        params.push(value);
        sets.push(`${field} = $${params.length}`);
        includedColumns.add(field);
      }

      // Status transition?
      let statusChange: { from: string; to: string } | null = null;
      if (payload.status !== undefined) {
        if (!isSopStatus(payload.status)) {
          throw new Error(`Invalid status: ${payload.status}`);
        }
        if (payload.status !== current.status) {
          statusChange = { from: current.status, to: payload.status };
          params.push(payload.status);
          sets.push(`status = $${params.length}`);
          includedColumns.add('status');

          // Only auto-set the status-timestamp column if the caller didn't
          // already provide a value for it in the same PATCH payload.
          const tsCol = STATUS_TIMESTAMP_COLUMN[payload.status];
          if (tsCol && !includedColumns.has(tsCol)) {
            sets.push(`${tsCol} = now()`);
          }
        }
      }

      // updated_by_user_id
      params.push(dbUser.id);
      sets.push(`updated_by_user_id = $${params.length}`);

      if (sets.length === 1) {
        // Only updated_by changed = nothing meaningful to do. Still touch the row.
      }

      params.push(id);
      const idParam = `$${params.length}`;

      const updateRes = await client.query<SopRow>(
        `update sops set ${sets.join(', ')} where id = ${idParam}
         returning *`,
        params
      );
      if (updateRes.rowCount === 0) throw new Error('Not found or not permitted');

      if (statusChange) {
        await client.query(
          `insert into sop_status_history (sop_id, org_id, from_status, to_status, changed_by_user_id, note)
           values ($1, $2, $3, $4, $5, $6)`,
          [
            id,
            current.org_id,
            statusChange.from,
            statusChange.to,
            dbUser.id,
            payload.status_note?.trim() || null,
          ]
        );
      }

      // Re-read from the view to get derived fields (days_since_arrived etc.)
      const fresh = await client.query<SopRow>(
        `select * from sops_with_age where id = $1 limit 1`,
        [id]
      );

      // If status transitioned to 'notified' or 'returned', look up the org's
      // GroupMe bot ID + rooftop name so we can dispatch a notification AFTER
      // the transaction commits.
      let groupmeJob: { botId: string; text: string } | null = null;
      if (
        statusChange &&
        (statusChange.to === 'notified' || statusChange.to === 'returned')
      ) {
        const orgRes = await client.query<{ groupme_bot_id: string | null }>(
          `select groupme_bot_id from organizations where id = $1`,
          [current.org_id]
        );
        const botId = orgRes.rows[0]?.groupme_bot_id;
        if (botId) {
          const rooftopRes = await client.query<{ name: string; brand: string | null }>(
            `select name, brand from rooftops where id = $1`,
            [fresh.rows[0].rooftop_id]
          );
          const rooftop = rooftopRes.rows[0];
          const text =
            statusChange.to === 'notified'
              ? buildArrivalMessage(fresh.rows[0], rooftop)
              : buildReturnMessage(fresh.rows[0], rooftop);
          groupmeJob = { botId, text };
        }
      }

      return { sop: fresh.rows[0], statusChanged: statusChange, groupmeJob };
    });

    // Fire GroupMe outside the DB transaction (best-effort, doesn't block).
    if (result.groupmeJob) {
      const job = result.groupmeJob;
      // Don't await — let it run in the background, but log any failure
      void postToGroupMe(job.botId, job.text).then((r) => {
        if (!r.ok) console.error('[sops.patch] GroupMe send failed:', r);
      });
    }

    return NextResponse.json({ ok: true, sop: result.sop, statusChanged: result.statusChanged });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message === 'Not found' ? 404 : 500;
    console.error('[sops.update] failed:', message);
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE /api/sops/:id — admin/manager only (RLS enforces it)
export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await getCurrentDbUser();

  const { id } = ctx.params;

  try {
    const deleted = await withTenantClient(userId, async (client) => {
      const res = await client.query(`delete from sops where id = $1`, [id]);
      return res.rowCount;
    });

    if (!deleted) {
      return NextResponse.json(
        { error: 'Not found or not permitted (admins/managers only)' },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
