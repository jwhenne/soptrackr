'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Stats = {
  totals: {
    organizations: number;
    users: number;
    rooftops: number;
    sops: number;
    openSops: number;
    pendingInvitations: number;
  };
  sopsByStatus: Record<string, number>;
  activity: {
    newOrgs30d: number;
    activeOrgs7d: number;
  };
};

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  groupme_configured: boolean;
  member_count: number;
  rooftop_count: number;
  total_sops: number;
  open_sops: number;
  last_sop_activity: string | null;
};

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, o] = await Promise.all([
          fetch('/api/super-admin/stats', { cache: 'no-store' }).then((r) => r.json()),
          fetch('/api/super-admin/orgs', { cache: 'no-store' }).then((r) => r.json()),
        ]);
        if (cancelled) return;
        if (s.error) throw new Error(s.error);
        if (o.error) throw new Error(o.error);
        setStats(s);
        setOrgs(o.orgs);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <P>Loading…</P>;
  if (error) return <P className="text-red-600">{error}</P>;
  if (!stats) return null;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Platform overview</h1>
      <p className="text-sm text-gray-500 mb-6">All organizations on SOPTrackr.</p>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <Stat label="Organizations" value={stats.totals.organizations} />
        <Stat label="Users" value={stats.totals.users} />
        <Stat label="Rooftops" value={stats.totals.rooftops} />
        <Stat label="Open SOPs" value={stats.totals.openSops} accent="text-[#185FA5]" />
        <Stat label="Active orgs (7d)" value={stats.activity.activeOrgs7d} accent="text-[#3B6D11]" />
        <Stat label="Pending invites" value={stats.totals.pendingInvitations} accent="text-[#854F0B]" />
      </div>

      {/* Orgs table */}
      <div className="bg-white border border-gray-200 border-t-[3px] border-t-oem-red rounded-[10px] overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">All organizations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <Th>Organization</Th>
                <Th>Members</Th>
                <Th>Rooftops</Th>
                <Th>Open SOPs</Th>
                <Th>Total SOPs</Th>
                <Th>GroupMe</Th>
                <Th>Last activity</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {orgs.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">No organizations yet.</td></tr>
              )}
              {orgs.map((o) => (
                <tr key={o.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <Td>
                    <Link href={`/admin/orgs/${o.id}`} className="font-semibold text-gray-900 hover:text-oem-red">
                      {o.name}
                    </Link>
                    <div className="text-xs text-gray-400">{o.slug}</div>
                  </Td>
                  <Td>{o.member_count}</Td>
                  <Td>{o.rooftop_count}</Td>
                  <Td>{o.open_sops}</Td>
                  <Td>{o.total_sops}</Td>
                  <Td>
                    {o.groupme_configured
                      ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sop-arrived-bg text-sop-arrived-fg">Configured</span>
                      : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sop-installed-bg text-sop-installed-fg">Not set</span>}
                  </Td>
                  <Td className="text-xs text-gray-500">{o.last_sop_activity ? formatDateTime(o.last_sop_activity) : '—'}</Td>
                  <Td className="text-xs text-gray-500">{formatDate(o.created_at)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-[10px] p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${accent || 'text-gray-900'}`}>{value}</div>
    </div>
  );
}

function P({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`max-w-[1200px] mx-auto px-4 py-12 text-sm text-gray-500 ${className}`}>{children}</p>;
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="text-left px-3.5 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
      {children}
    </th>
  );
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3.5 py-3 align-middle ${className}`}>{children}</td>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
