'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  SOP_STATUS_LABELS,
  SOP_STATUS_BADGE_CLASS,
  RETURN_WARNING_DAYS,
  type SopRow,
} from '@/lib/sops';

type Org = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  groupme_bot_id: string | null;
  groupme_group_name: string | null;
  subscription_status: 'pending' | 'active' | 'past_due' | 'suspended' | 'cancelled';
  monthly_rate_cents: number;
  annual_contract: boolean;
  setup_fee_waived: boolean;
  subscription_started_at: string | null;
  current_period_end: string | null;
  billing_notes: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-900 border-amber-200',
  active:    'bg-emerald-100 text-emerald-900 border-emerald-200',
  past_due:  'bg-orange-100 text-orange-900 border-orange-300',
  suspended: 'bg-red-100 text-red-900 border-red-300',
  cancelled: 'bg-gray-200 text-gray-700 border-gray-300',
};

type Member = {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  joined_at: string;
};

type Rooftop = {
  id: string; name: string; brand: string | null; city: string | null; state: string | null; created_at: string;
};

type Invitation = {
  id: string; email: string; role: string; token: string;
  accepted_at: string | null; expires_at: string; created_at: string;
};

type DetailResponse = {
  org: Org;
  members: Member[];
  rooftops: Rooftop[];
  sops: SopRow[];
  invitations: Invitation[];
  sopTotals: Record<string, number>;
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', manager: 'Manager', parts_consultant: 'Parts Consultant',
  service_advisor: 'Service Advisor', technician: 'Technician',
};

export default function OrgDetail({ orgId }: { orgId: string }) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = async () => {
    const res = await fetch(`/api/super-admin/orgs/${orgId}`, { cache: 'no-store' });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to load');
    setData(body);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3500);
  }

  async function patchBilling(body: Record<string, unknown>, successMsg: string) {
    try {
      const res = await fetch(`/api/super-admin/orgs/${orgId}/billing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      await refresh();
      showToast(successMsg);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed');
    }
  }

  if (loading) return <P>Loading…</P>;
  if (error) return <P className="text-red-600">{error}</P>;
  if (!data) return null;

  const { org, members, rooftops, sops, invitations, sopTotals } = data;
  const totalSops = Object.values(sopTotals).reduce((a, b) => a + b, 0);
  const openSops = totalSops - (sopTotals.complete ?? 0) - (sopTotals.returned ?? 0);

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="text-xs text-gray-500 mb-2">
        <Link href="/admin" className="hover:text-oem-red">← All organizations</Link>
      </div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${STATUS_BADGE[org.subscription_status]}`}>
              {org.subscription_status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">slug: {org.slug} · created {formatDate(org.created_at)}</p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <div>{members.length} members · {rooftops.length} rooftops</div>
          <div>{openSops} open · {totalSops} total SOPs</div>
        </div>
      </div>

      {/* Billing card — first since it's the most-used admin action */}
      <BillingCard org={org} totalRooftops={rooftops.length} onSave={patchBilling} />

      {/* Org info */}
      <Card title="Organization" className="mt-6">
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <Kv label="Name" value={org.name} />
          <Kv label="Slug" value={org.slug} />
          <Kv label="Created" value={formatDateTime(org.created_at)} />
          <Kv label="Updated" value={formatDateTime(org.updated_at)} />
          <Kv label="GroupMe bot ID" value={org.groupme_bot_id ? <span className="font-mono text-xs">{maskBotId(org.groupme_bot_id)}</span> : '— not set —'} />
          <Kv label="GroupMe group" value={org.groupme_group_name || '—'} />
        </div>
      </Card>

      {/* Members */}
      <Card title={`Members (${members.length})`} className="mt-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Joined</Th></tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email.split('@')[0];
              return (
                <tr key={m.user_id} className="border-b border-gray-100 last:border-0">
                  <Td className="font-medium">{name}</Td>
                  <Td className="text-gray-600">{m.email}</Td>
                  <Td><span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">{ROLE_LABELS[m.role] || m.role}</span></Td>
                  <Td className="text-xs text-gray-500">{formatDate(m.joined_at)}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Rooftops */}
      <Card title={`Rooftops (${rooftops.length})`} className="mt-6">
        {rooftops.length === 0 ? (
          <p className="text-sm text-gray-500">No rooftops.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr><Th>Name</Th><Th>Brand</Th><Th>Location</Th><Th>Created</Th></tr>
            </thead>
            <tbody>
              {rooftops.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0">
                  <Td className="font-medium">{r.name}</Td>
                  <Td className="text-gray-600">{r.brand || '—'}</Td>
                  <Td className="text-gray-600">{[r.city, r.state].filter(Boolean).join(', ') || '—'}</Td>
                  <Td className="text-xs text-gray-500">{formatDate(r.created_at)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Pending invitations */}
      {invitations.filter((i) => !i.accepted_at).length > 0 && (
        <Card title={`Pending invitations (${invitations.filter((i) => !i.accepted_at).length})`} className="mt-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr><Th>Email</Th><Th>Role</Th><Th>Expires</Th></tr>
            </thead>
            <tbody>
              {invitations.filter((i) => !i.accepted_at).map((inv) => (
                <tr key={inv.id} className="border-b border-gray-100 last:border-0">
                  <Td>{inv.email}</Td>
                  <Td>{ROLE_LABELS[inv.role] || inv.role}</Td>
                  <Td className="text-xs text-gray-500">{formatDate(inv.expires_at)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-semibold bg-[#27500A] text-[#EAF3DE] max-w-sm">
          {toast}
        </div>
      )}

      {/* SOPs */}
      <Card title={`SOPs (${sops.length} most recent)`} className="mt-6">
        {sops.length === 0 ? (
          <p className="text-sm text-gray-500">No SOPs yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <Th>RO / SOP#</Th>
                <Th>Part</Th>
                <Th>Customer</Th>
                <Th>Status</Th>
                <Th>Age</Th>
                <Th>Outreach</Th>
              </tr>
            </thead>
            <tbody>
              {sops.map((s) => {
                const stale = s.days_since_arrived !== null && s.days_since_arrived >= RETURN_WARNING_DAYS;
                return (
                  <tr key={s.id} className="border-b border-gray-100 last:border-0">
                    <Td className="font-mono text-xs">
                      {s.sop_number && <div className="text-oem-red font-semibold">{s.sop_number}</div>}
                      <div>{s.ro_number}</div>
                    </Td>
                    <Td>
                      <div className="font-medium">{s.part_description}</div>
                      {s.part_number && <div className="text-xs text-gray-500 font-mono">{s.part_number}</div>}
                    </Td>
                    <Td>{s.customer_name}</Td>
                    <Td>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${SOP_STATUS_BADGE_CLASS[s.status]}`}>
                        {SOP_STATUS_LABELS[s.status]}
                      </span>
                    </Td>
                    <Td>
                      {s.days_since_arrived !== null
                        ? <span className={stale ? 'text-red-700 font-bold' : 'text-gray-700'}>{stale && '⚠ '}{s.days_since_arrived}d</span>
                        : <span className="text-gray-400">—</span>}
                    </Td>
                    <Td className="text-xs text-gray-500">
                      {s.contact_attempts_count > 0 ? `${s.contact_attempts_count} log${s.contact_attempts_count > 1 ? 's' : ''}` : '—'}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function BillingCard({
  org, totalRooftops, onSave,
}: {
  org: Org;
  totalRooftops: number;
  onSave: (body: Record<string, unknown>, msg: string) => Promise<void>;
}) {
  const [statusDraft, setStatusDraft] = useState(org.subscription_status);
  const [rateDollars, setRateDollars] = useState(String(org.monthly_rate_cents / 100));
  const [annual, setAnnual] = useState(org.annual_contract);
  const [waived, setWaived] = useState(org.setup_fee_waived);
  const [periodEnd, setPeriodEnd] = useState(org.current_period_end || '');
  const [notes, setNotes] = useState(org.billing_notes || '');
  const [saving, setSaving] = useState(false);

  const monthlyTotalDollars = (Number(rateDollars) || 0) * totalRooftops;

  async function saveAll() {
    setSaving(true);
    const cents = Math.round((Number(rateDollars) || 0) * 100);
    await onSave({
      subscription_status: statusDraft,
      monthly_rate_cents: cents,
      annual_contract: annual,
      setup_fee_waived: waived,
      current_period_end: periodEnd || null,
      billing_notes: notes || null,
    }, 'Billing updated.');
    setSaving(false);
  }

  async function quickActivate(days: number) {
    setSaving(true);
    await onSave({
      subscription_status: 'active',
      extend_period_days: days,
    }, `Activated and period extended by ${days} days.`);
    setStatusDraft('active');
    setSaving(false);
  }

  return (
    <div className="bg-white border border-gray-200 border-t-[3px] border-t-oem-red rounded-[10px] overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Billing</h2>
        <span className="text-xs text-gray-500">QuickBooks-managed · update here when their QBO state changes</span>
      </div>
      <div className="p-4 space-y-4">
        {/* Quick activate buttons */}
        {org.subscription_status !== 'active' && (
          <div className="flex flex-wrap gap-2 p-3 rounded-md bg-emerald-50 border border-emerald-200">
            <span className="text-xs font-semibold text-emerald-900 self-center">Quick activate:</span>
            <button
              type="button"
              onClick={() => quickActivate(30)}
              disabled={saving}
              className="text-xs font-semibold px-3 py-1.5 bg-emerald-700 text-white rounded-md hover:bg-emerald-800 disabled:opacity-60"
            >
              Activate (monthly, +30d)
            </button>
            <button
              type="button"
              onClick={() => quickActivate(365)}
              disabled={saving}
              className="text-xs font-semibold px-3 py-1.5 bg-emerald-700 text-white rounded-md hover:bg-emerald-800 disabled:opacity-60"
            >
              Activate (annual, +365d)
            </button>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Subscription status">
            <select
              value={statusDraft}
              onChange={(e) => setStatusDraft(e.target.value as Org['subscription_status'])}
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white focus:border-oem-red focus:outline-none cursor-pointer"
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="past_due">Past due</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Field>
          <Field label="Monthly rate per rooftop ($)">
            <input
              type="number"
              min={0}
              step={1}
              value={rateDollars}
              onChange={(e) => setRateDollars(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:border-oem-red focus:outline-none focus:ring-2 focus:ring-oem-red/10"
            />
            <p className="mt-1 text-xs text-gray-500">
              {totalRooftops} rooftop{totalRooftops === 1 ? '' : 's'} × ${rateDollars || 0} = <strong>${monthlyTotalDollars.toLocaleString()}/mo</strong>
            </p>
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Current period ends (next invoice due)">
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:border-oem-red focus:outline-none"
            />
          </Field>
          <Field label="Subscription started">
            <div className="text-sm text-gray-700 px-3 py-2 border border-transparent">
              {org.subscription_started_at
                ? new Date(org.subscription_started_at).toLocaleDateString()
                : <span className="text-gray-400">— not yet activated —</span>}
            </div>
          </Field>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={annual}
              onChange={(e) => setAnnual(e.target.checked)}
              className="w-[16px] h-[16px] accent-oem-red cursor-pointer"
            />
            <span>Annual contract</span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={waived}
              onChange={(e) => setWaived(e.target.checked)}
              className="w-[16px] h-[16px] accent-oem-red cursor-pointer"
            />
            <span>Setup fee waived</span>
          </label>
        </div>

        <Field label="Billing notes (free text — use for invoice numbers, payment dates, etc.)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. INV-2026-001 sent 5/10, paid 5/15 via ACH"
            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:border-oem-red focus:outline-none resize-y"
          />
        </Field>

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={saveAll}
            disabled={saving}
            className="text-sm font-semibold px-4 py-2 bg-oem-red text-white rounded-lg hover:bg-oem-red-dark disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save billing changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-600 font-medium mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function maskBotId(id: string): string {
  if (id.length <= 12) return id;
  return id.slice(0, 6) + '••••••' + id.slice(-4);
}

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 border-t-[3px] border-t-oem-yellow rounded-[10px] overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function Kv({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 px-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 text-right">{value}</span>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="text-left px-3.5 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3.5 py-3 align-middle ${className}`}>{children}</td>;
}

function P({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`max-w-[1200px] mx-auto px-4 py-12 text-sm text-gray-500 ${className}`}>{children}</p>;
}
function formatDate(iso: string): string { return new Date(iso).toLocaleDateString(); }
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
