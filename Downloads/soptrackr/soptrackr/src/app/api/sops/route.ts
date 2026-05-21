import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { withTenantClient } from '@/lib/db';
import { getCurrentDbUser, getCurrentUserOrgs } from '@/lib/auth';
import { canManageBinLocation, isSopStatus, type SopRow } from '@/lib/sops';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/sops?rooftop_id=&status=&q=&limit=
// Returns the user's org's SOPs, RLS auto-scopes the result.
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getCurrentDbUser();
  const orgs = await getCurrentUserOrgs();
  if (orgs.length === 0) {
    return NextResponse.json({ error: 'No organization' }, { status: 400 });
  }

  const url = new URL(request.url);
  const rooftopId = url.searchParams.get('rooftop_id');
  const statusParam = url.searchParams.get('status');
  const q = url.searchParams.get('q')?.trim();
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '200', 10), 1), 500);

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (rooftopId) { params.push(rooftopId); conditions.push(`rooftop_id = $${params.length}`); }
  if (statusParam && isSopStatus(statusParam)) {
    params.push(statusParam); conditions.push(`status = $${params.length}`);
  }
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    const i = params.length;
    conditions.push(
      `(lower(ro_number) like $${i} or lower(coalesce(sop_number,'')) like $${i} or lower(customer_name) like $${i} or lower(part_description) like $${i} or lower(coalesce(part_number,'')) like $${i} or lower(coalesce(vehicle,'')) like $${i})`
    );
  }
  const whereClause = conditions.length ? `where ${conditions.join(' and ')}` : '';

  const sopsResult = await withTenantClient(userId, async (client) =>
    client.query<SopRow>(
      `select * from sops_with_age
       ${whereClause}
       order by
         case when status in ('complete','returned') then 1 else 0 end,
         coalesce(arrived_at, ordered_at) desc
       limit ${limit}`,
      params
    )
  );

  const totalsResult = await withTenantClient(userId, async (client) =>
    client.query<{ status: string; count: string }>(
      `select status, count(*)::text as count from sops group by status`
    )
  );

  // Per-rep tabs: anyone who has logged a contact attempt becomes a tab,
  // with the count = distinct SOPs they've touched.
  const repsResult = await withTenantClient(userId, async (client) =>
    client.query<{ name: string; sop_ids: string[]; count: string }>(
      `select
         contacted_by_name as name,
         array_agg(distinct sop_id::text) as sop_ids,
         count(distinct sop_id)::text as count
       from sop_contact_log
       where contacted_by_name is not null
         and length(trim(contacted_by_name)) > 0
       group by contacted_by_name
       order by lower(contacted_by_name)`
    )
  );

  const totals: Record<string, number> = {};
  for (const r of totalsResult.rows) totals[r.status] = Number(r.count);

  const repTabs = repsResult.rows.map((r) => ({
    name: r.name,
    count: Number(r.count),
    sop_ids: r.sop_ids,
  }));

  // Strip the sensitive bin_location from any SOP whose org the current user
  // isn't permitted to see bin data for. Server-side gate — the value never
  // reaches an unauthorized browser regardless of the UI.
  const roleByOrg = new Map(orgs.map((o) => [o.org_id, o.role]));
  const sops = sopsResult.rows.map((s) => {
    if (canManageBinLocation(roleByOrg.get(s.org_id))) return s;
    const { bin_location: _omit, ...rest } = s;
    return rest as SopRow;
  });

  return NextResponse.json({ sops, totals, repTabs });
}

type CreateSopPayload = {
  rooftop_id?: string;
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
  eta?: string;            // YYYY-MM-DD
  backordered?: boolean;
};

// POST /api/sops — create a new SOP, status starts at 'ordered'
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await getCurrentDbUser();
  if (!dbUser) return NextResponse.json({ error: 'User sync failed' }, { status: 500 });

  const orgs = await getCurrentUserOrgs();
  if (orgs.length === 0) {
    return NextResponse.json({ error: 'No organization' }, { status: 400 });
  }
  const orgId = orgs[0].org_id;

  let payload: CreateSopPayload;
  try {
    payload = (await request.json()) as CreateSopPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const rooftopId = payload.rooftop_id?.trim();
  const ro = payload.ro_number?.trim();
  const sopNumber = payload.sop_number?.trim();
  const desc = payload.part_description?.trim();
  const customer = payload.customer_name?.trim();
  const advisorTrim = payload.advisor?.trim();
  const eta = payload.eta && /^\d{4}-\d{2}-\d{2}$/.test(payload.eta) ? payload.eta : null;
  const backordered = payload.backordered === true;

  if (!rooftopId) return NextResponse.json({ error: 'Rooftop is required' }, { status: 400 });
  if (!sopNumber) return NextResponse.json({ error: 'SOP number is required' }, { status: 400 });
  if (!ro)       return NextResponse.json({ error: 'RO number is required' }, { status: 400 });
  if (!desc)     return NextResponse.json({ error: 'Part description is required' }, { status: 400 });
  if (!customer) return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
  if (!advisorTrim) return NextResponse.json({ error: 'Advisor is required' }, { status: 400 });

  const vehicleStaying =
    payload.vehicle_staying === true || payload.vehicle_staying === 'yes' ? true :
    payload.vehicle_staying === false || payload.vehicle_staying === 'no' ? false :
    null;

  try {
    const sop = await withTenantClient(userId, async (client) => {
      // Verify rooftop belongs to the user's org (RLS does this implicitly,
      // but doing it explicitly gives a clearer error).
      const { rowCount: rooftopOk } = await client.query(
        `select 1 from rooftops where id = $1 and org_id = $2`,
        [rooftopId, orgId]
      );
      if (!rooftopOk) {
        throw new Error('Rooftop not found in your organization');
      }

      const insertRes = await client.query<SopRow>(
        `insert into sops (
           org_id, rooftop_id,
           ro_number, sop_number, part_number, part_description,
           customer_name, customer_phone, customer_email,
           vehicle, vehicle_staying, advisor, notes,
           eta, backordered,
           created_by_user_id, updated_by_user_id
         ) values (
           $1, $2,
           $3, $4, $5, $6,
           $7, $8, $9,
           $10, $11, $12, $13,
           $14, $15,
           $16, $16
         )
         returning *`,
        [
          orgId, rooftopId,
          ro, sopNumber, payload.part_number?.trim() || null, desc,
          customer, payload.customer_phone?.trim() || null, payload.customer_email?.trim() || null,
          payload.vehicle?.trim() || null, vehicleStaying, advisorTrim, payload.notes?.trim() || null,
          eta, backordered,
          dbUser.id,
        ]
      );

      const created = insertRes.rows[0];

      await client.query(
        `insert into sop_status_history (sop_id, org_id, from_status, to_status, changed_by_user_id)
         values ($1, $2, null, 'ordered', $3)`,
        [created.id, orgId, dbUser.id]
      );

      return created;
    });

    return NextResponse.json({ ok: true, sop });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[sops.create] failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
