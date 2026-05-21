'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  SOP_STATUS_LABELS,
  SOP_STATUS_BADGE_CLASS,
  RETURN_WARNING_DAYS,
  type SopRow,
  type SopStatus,
} from '@/lib/sops';
import type { OrgMembership, Rooftop } from '@/lib/auth';
import CreateSopModal from './CreateSopModal';
import ScheduleDateModal from './ScheduleDateModal';
import SopDetailPanel from './SopDetailPanel';

type CurrentUser = { id: string; firstName: string | null; lastName: string | null; email: string };

type Props = {
  currentUser: CurrentUser;
  org: OrgMembership;
  rooftops: Rooftop[];
};

type Totals = Record<string, number>;

type RepTab = { name: string; count: number; sop_ids: string[] };

// Tab values include the SOP statuses + special tabs ('all', 'rep:<name>')
type TabValue = 'all' | SopStatus | `rep:${string}`;

export default function SopsView({ currentUser, org, rooftops }: Props) {
  const [sops, setSops] = useState<SopRow[]>([]);
  const [totals, setTotals] = useState<Totals>({});
  const [repTabs, setRepTabs] = useState<RepTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabValue>('all');
  // Smart stat-card filter (overrides the tab when active): 'transit' | 'awaiting' | 'scheduled' | null
  const [statFilter, setStatFilter] = useState<'transit' | 'awaiting' | 'scheduled' | null>(null);

  const [statusDropdown, setStatusDropdown] = useState<'' | SopStatus>('');
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [schedulingSop, setSchedulingSop] = useState<SopRow | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'green' | 'red' | 'groupme' } | null>(null);

  const showToast = useCallback((msg: string, tone: 'green' | 'red' | 'groupme' = 'green') => {
    setToast({ msg, tone });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadSops = useCallback(async () => {
    setError(null);
    try {
      // Always pull all of the org's SOPs; filtering is done client-side so
      // tabs/stats can reflect the full data set.
      const res = await fetch(`/api/sops?limit=500`, { cache: 'no-store' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load SOPs');
      const data = (await res.json()) as { sops: SopRow[]; totals: Totals; repTabs?: RepTab[] };
      setSops(data.sops);
      setTotals(data.totals);
      setRepTabs(data.repTabs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSops();
    // Auto-refresh every 30s, matching the existing app
    const id = window.setInterval(loadSops, 30_000);
    return () => window.clearInterval(id);
  }, [loadSops]);

  // ----- Smart counts -----
  const counts = useMemo(() => {
    const inTransit = sops.filter((o) => o.status === 'ordered' || o.status === 'in_transit').length;
    const awaitingBdc = sops.filter(
      (o) => (o.status === 'arrived' || o.status === 'notified') && (o.contact_attempts_count || 0) === 0
    ).length;
    const scheduled = sops.filter((o) => o.status === 'scheduled').length;
    const active = sops.filter((o) => o.status !== 'complete' && o.status !== 'returned').length;
    return { active, inTransit, awaitingBdc, scheduled };
  }, [sops]);

  // ----- Per-rep tabs (auto-populated from contact log via /api/sops response) -----
  // We only know reps from contact_attempts_count > 0. To get the actual names we'd
  // need a separate endpoint. For now, derive from the loaded SOPs' contact log when
  // a detail is opened. We omit per-rep tabs in this initial port; can add later.

  // Build a quick lookup for rep → set of SOP IDs for fast filtering
  const repSopIds = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const r of repTabs) m.set(r.name, new Set(r.sop_ids));
    return m;
  }, [repTabs]);

  // ----- Filter pipeline -----
  const filteredSops = useMemo(() => {
    const q = search.trim().toLowerCase();
    const repFilter = activeTab.startsWith('rep:') ? activeTab.slice(4) : null;
    const repSet = repFilter ? repSopIds.get(repFilter) : null;
    return sops.filter((o) => {
      // Stat-card filter overrides tabs
      if (statFilter === 'transit') {
        if (!(o.status === 'ordered' || o.status === 'in_transit')) return false;
      } else if (statFilter === 'awaiting') {
        if (!((o.status === 'arrived' || o.status === 'notified') && (o.contact_attempts_count || 0) === 0)) return false;
      } else if (statFilter === 'scheduled') {
        if (o.status !== 'scheduled') return false;
      } else if (repFilter) {
        if (!repSet || !repSet.has(o.id)) return false;
      } else if (activeTab !== 'all') {
        if (o.status !== activeTab) return false;
      }
      // Status dropdown
      if (statusDropdown && o.status !== statusDropdown) return false;
      // Search
      if (q) {
        const hay = [
          o.sop_number, o.ro_number, o.customer_name, o.customer_phone,
          o.part_description, o.part_number, o.vehicle, o.advisor,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sops, activeTab, statFilter, statusDropdown, search, repSopIds]);

  function clickStat(filter: 'active' | 'transit' | 'awaiting' | 'scheduled') {
    if (filter === 'active') {
      setActiveTab('all');
      setStatFilter(null);
    } else {
      setActiveTab('all');
      setStatFilter(filter);
    }
    setStatusDropdown('');
    setSearch('');
  }

  function clickTab(tab: TabValue) {
    setActiveTab(tab);
    setStatFilter(null);
    setStatusDropdown('');
    setSearch('');
  }

  // ----- Status transition helpers -----
  async function patchSop(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/sops/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const e = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(e.error || 'Update failed');
    }
    return res.json();
  }

  async function markArrived(o: SopRow) {
    try {
      await patchSop(o.id, { status: 'arrived' });
      showToast(`Marked arrived: ${o.customer_name}'s ${o.part_description}`, 'green');
      await loadSops();
    } catch (e) { showToast((e as Error).message, 'red'); }
  }
  async function notifyBdc(o: SopRow) {
    try {
      await patchSop(o.id, { status: 'notified', notified_to_bdc: true });
      showToast(`BDC notified for ${o.customer_name}.`, 'groupme');
      await loadSops();
    } catch (e) { showToast((e as Error).message, 'red'); }
  }
  function markScheduled(o: SopRow) {
    setSchedulingSop(o);
  }
  async function confirmScheduled(o: SopRow, date: string) {
    try {
      await patchSop(o.id, { status: 'scheduled', scheduled_at: date });
      showToast(`Install scheduled for ${o.customer_name} on ${date}.`, 'green');
      setSchedulingSop(null);
      await loadSops();
    } catch (e) { showToast((e as Error).message, 'red'); }
  }
  async function markInstalled(o: SopRow) {
    if (!window.confirm(`Mark installed for ${o.customer_name}?`)) return;
    try {
      await patchSop(o.id, { status: 'installed' });
      showToast(`Installed: ${o.customer_name}'s ${o.part_description}`, 'green');
      await loadSops();
    } catch (e) { showToast((e as Error).message, 'red'); }
  }
  async function markComplete(o: SopRow) {
    if (!window.confirm(`Mark job complete for ${o.customer_name}? This confirms the part has been billed and handed out.`)) return;
    try {
      await patchSop(o.id, { status: 'complete' });
      showToast(`Job complete — ${o.customer_name}'s part billed and handed out.`, 'green');
      await loadSops();
    } catch (e) { showToast((e as Error).message, 'red'); }
  }
  async function returnPart(o: SopRow) {
    const days = o.days_since_arrived ?? 0;
    if (!window.confirm(`Mark this part for return?\n\nCustomer: ${o.customer_name}\nPart: ${o.part_description}\nDays since arrival: ${days}`)) return;
    try {
      await patchSop(o.id, { status: 'returned', return_reason: `Returned after ${days} days`, status_note: `Returned after ${days} days` });
      showToast(`Part return logged for ${o.customer_name}.`, 'green');
      await loadSops();
    } catch (e) { showToast((e as Error).message, 'red'); }
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Stats bar — 4 smart cards, click to filter */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Active orders" value={counts.active} accent="text-[#185FA5]"
          onClick={() => clickStat('active')} active={statFilter === null && activeTab === 'all'} />
        <StatCard label="Not yet arrived" value={counts.inTransit} accent="text-[#854F0B]"
          onClick={() => clickStat('transit')} active={statFilter === 'transit'} />
        <StatCard label="Awaiting BDC call" value={counts.awaitingBdc} accent="text-[#993C1D]"
          onClick={() => clickStat('awaiting')} active={statFilter === 'awaiting'} />
        <StatCard label="Scheduled" value={counts.scheduled} accent="text-[#3B6D11]"
          onClick={() => clickStat('scheduled')} active={statFilter === 'scheduled'} />
      </div>

      {/* Main card */}
      <div className="bg-white border border-gray-200 border-t-[3px] border-t-oem-yellow rounded-[10px] overflow-hidden">
        {/* Tabs */}
        <div className="flex gap-0.5 px-4 border-b border-gray-200 bg-gray-50 overflow-x-auto">
          <Tab active={statFilter === null && activeTab === 'all'} onClick={() => clickTab('all')}>All orders</Tab>
          <Tab active={activeTab === 'ordered'} onClick={() => clickTab('ordered')}>Ordered</Tab>
          <Tab active={activeTab === 'in_transit'} onClick={() => clickTab('in_transit')}>In transit</Tab>
          <Tab active={activeTab === 'arrived'} onClick={() => clickTab('arrived')}>Arrived</Tab>
          <Tab active={activeTab === 'notified'} onClick={() => clickTab('notified')}>BDC notified</Tab>
          <Tab active={activeTab === 'scheduled'} onClick={() => clickTab('scheduled')}>Scheduled</Tab>
          <Tab active={activeTab === 'complete'} onClick={() => clickTab('complete')}>Job complete</Tab>
          <Tab active={activeTab === 'returned'} onClick={() => clickTab('returned')}>Returned</Tab>

          {repTabs.length > 0 && (
            <>
              <div className="w-px self-stretch my-2 mx-1 bg-gray-200 flex-shrink-0" aria-hidden />
              {repTabs.map((rep) => (
                <Tab
                  key={rep.name}
                  active={activeTab === `rep:${rep.name}`}
                  onClick={() => clickTab(`rep:${rep.name}`)}
                >
                  <span>{rep.name}</span>
                  <span className="ml-1 inline-flex items-center justify-center bg-oem-yellow text-gray-900 text-[10px] font-bold px-1.5 py-px rounded-full leading-none">
                    {rep.count}
                  </span>
                </Tab>
              ))}
            </>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center px-4 py-3 border-b border-gray-100">
          <input
            type="text"
            placeholder="Search by customer, part, RO# or SOP#..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:border-oem-red focus:outline-none focus:ring-2 focus:ring-oem-red/10"
          />
          {rooftops.length > 1 && (
            <select className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg bg-white focus:border-oem-red focus:outline-none">
              <option value="">All rooftops</option>
              {rooftops.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
          <select
            value={statusDropdown}
            onChange={(e) => setStatusDropdown(e.target.value as '' | SopStatus)}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg bg-white focus:border-oem-red focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="ordered">Ordered</option>
            <option value="in_transit">In transit</option>
            <option value="arrived">Arrived</option>
            <option value="notified">BDC notified</option>
            <option value="scheduled">Scheduled</option>
            <option value="installed">Installed</option>
            <option value="returned">Part returned</option>
            <option value="complete">Job complete</option>
          </select>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="text-sm px-3 py-1.5 bg-oem-red text-white font-semibold rounded-lg hover:bg-oem-red-dark"
          >
            + Add order
          </button>
        </div>

        {error && <div className="px-4 py-3 bg-red-50 border-b border-red-200 text-red-800 text-sm">{error}</div>}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <Th>Part / RO#</Th>
                <Th>Customer</Th>
                <Th>Part #</Th>
                <Th>Est. arrival</Th>
                <Th>Vehicle staying?</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">Loading orders...</td></tr>
              )}
              {!loading && filteredSops.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">No orders found</td></tr>
              )}
              {!loading && filteredSops.map((o) => {
                const stale = o.days_since_arrived !== null && o.days_since_arrived >= RETURN_WARNING_DAYS;
                return (
                  <tr key={o.id} className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
                    <Td>
                      <div className="font-semibold text-[13px] text-gray-900 flex items-center gap-1.5 flex-wrap">
                        {o.part_description}
                        {o.backordered && (
                          <span className="bg-sop-backordered-bg text-sop-backordered-fg border border-[#AFA9EC] text-[10px] font-bold px-2 py-0.5 rounded-full">BACKORDERED</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {o.sop_number && <><span className="text-oem-red font-semibold">{o.sop_number}</span> · </>}
                        {o.ro_number}
                      </div>
                    </Td>
                    <Td>
                      <div>{o.customer_name}</div>
                      <div className="text-xs text-gray-500">{o.customer_phone || ''}</div>
                    </Td>
                    <Td className="text-xs text-gray-500 font-mono">{o.part_number || '—'}</Td>
                    <Td className="text-[13px]">{o.eta || '—'}</Td>
                    <Td>{vehicleStayingBadge(o.vehicle_staying)}</Td>
                    <Td>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${SOP_STATUS_BADGE_CLASS[o.status]}`}>
                        {SOP_STATUS_LABELS[o.status]}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1.5">
                        {(o.status === 'ordered' || o.status === 'in_transit') && (
                          <ActionBtn variant="arrived" onClick={(e) => { e.stopPropagation(); void markArrived(o); }}>Mark arrived</ActionBtn>
                        )}
                        {o.status === 'arrived' && (
                          <ActionBtn variant="groupme" onClick={(e) => { e.stopPropagation(); void notifyBdc(o); }}>Notify BDC</ActionBtn>
                        )}
                        {o.status === 'notified' && (
                          <ActionBtn variant="primary" onClick={(e) => { e.stopPropagation(); void markScheduled(o); }}>Mark scheduled</ActionBtn>
                        )}
                        {o.status === 'scheduled' && (
                          <ActionBtn variant="default" onClick={(e) => { e.stopPropagation(); void markInstalled(o); }}>Mark installed</ActionBtn>
                        )}
                        {o.status === 'installed' && (
                          <ActionBtn variant="complete" onClick={(e) => { e.stopPropagation(); void markComplete(o); }}>✓ Job complete</ActionBtn>
                        )}
                        {o.arrived_at && o.status !== 'installed' && o.status !== 'returned' && o.status !== 'complete' && (
                          <ActionBtn variant={stale ? 'return-warn' : 'return'} onClick={(e) => { e.stopPropagation(); void returnPart(o); }}>
                            {stale && '⚠ '}Return part ({o.days_since_arrived}d)
                          </ActionBtn>
                        )}
                        <ActionBtn variant="default" onClick={(e) => { e.stopPropagation(); setSelectedId(o.id); }}>
                          View
                          {o.contact_attempts_count > 0 && (
                            <span className="ml-1 inline-flex items-center justify-center bg-oem-yellow text-gray-900 text-[10px] font-bold px-1.5 rounded-full">{o.contact_attempts_count}</span>
                          )}
                        </ActionBtn>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      {createOpen && (
        <CreateSopModal
          rooftops={rooftops}
          defaultAdvisor={[currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ') || ''}
          onClose={() => setCreateOpen(false)}
          onCreated={async (sop) => {
            setCreateOpen(false);
            showToast(`Order ${sop.ro_number} added for ${sop.customer_name}.`, 'green');
            await loadSops();
          }}
        />
      )}

      {/* Detail panel */}
      {selectedId && (
        <SopDetailPanel
          sopId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={async (msg) => {
            if (msg) showToast(msg, 'green');
            await loadSops();
          }}
        />
      )}

      {/* Schedule install date picker */}
      {schedulingSop && (
        <ScheduleDateModal
          customerName={schedulingSop.customer_name}
          partDescription={schedulingSop.part_description}
          onClose={() => setSchedulingSop(null)}
          onConfirm={(date) => confirmScheduled(schedulingSop, date)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={
          'fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-semibold max-w-sm ' +
          (toast.tone === 'green' ? 'bg-[#27500A] text-[#EAF3DE]' :
           toast.tone === 'groupme' ? 'bg-[#00AFF0] text-white' :
           'bg-[#791F1F] text-[#FCEBEB]')
        }>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function vehicleStayingBadge(v: boolean | null) {
  if (v === true) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sop-staying-bg text-sop-staying-fg">Yes</span>;
  if (v === false) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sop-not-staying-bg text-sop-not-staying-fg">No</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sop-unknown-bg text-sop-unknown-fg">—</span>;
}

function StatCard({ label, value, accent, onClick, active }: { label: string; value: number; accent: string; onClick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'text-left bg-white border rounded-[10px] p-4 transition hover:-translate-y-0.5 hover:shadow-md ' +
        (active ? 'border-oem-red ring-2 ring-oem-red/10' : 'border-gray-200 hover:border-oem-red')
      }
    >
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${accent}`}>{value}</div>
    </button>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'px-4 py-2.5 text-[13px] whitespace-nowrap border-b-2 transition ' +
        (active
          ? 'text-oem-red font-bold border-oem-red'
          : 'text-gray-500 border-transparent hover:text-gray-900')
      }
    >
      {children}
    </button>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-3.5 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
      {children}
    </th>
  );
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3.5 py-3 align-middle ${className}`}>{children}</td>;
}

function ActionBtn({
  children, onClick, variant,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  variant: 'default' | 'primary' | 'arrived' | 'groupme' | 'complete' | 'return' | 'return-warn';
}) {
  const variantClass: Record<typeof variant, string> = {
    default: 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100 hover:border-gray-500',
    primary: 'bg-oem-red text-white border-oem-red hover:bg-oem-red-dark',
    arrived: 'bg-[#FFF8DC] text-[#7a5800] border-oem-yellow hover:bg-[#FFE890]',
    groupme: 'bg-[#00AFF0] text-white border-[#00AFF0] hover:bg-[#0090C8]',
    complete: 'bg-[#27500A] text-white border-[#27500A] hover:bg-[#1d3d05]',
    return: 'bg-[#EAF3DE] text-[#3B6D11] border-[#C0DD97] hover:bg-[#d6ebbb]',
    'return-warn': 'bg-oem-yellow text-[#7a3800] border-oem-yellow-border hover:bg-[#e6c200] font-bold animate-pulse-warn',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'text-[12px] px-3 py-1.5 border rounded-md font-medium whitespace-nowrap transition active:scale-95 ' +
        variantClass[variant]
      }
    >
      {children}
    </button>
  );
}
