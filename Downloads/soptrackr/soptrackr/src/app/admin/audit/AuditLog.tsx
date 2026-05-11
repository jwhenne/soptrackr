'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Entry = {
  id: string;
  super_admin_name: string;
  action: string;
  target_org_id: string | null;
  target_org_name: string | null;
  target_resource: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

const ACTION_LABELS: Record<string, string> = {
  view_org: 'Viewed organization',
  edit_groupme: 'Edited GroupMe settings',
  reset_invite: 'Reset invitation',
  add_super_admin: 'Added super admin',
};

export default function AuditLog() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/super-admin/audit?limit=200', { cache: 'no-store' });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load');
        if (!cancelled) setEntries(body.entries);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Audit log</h1>
      <p className="text-sm text-gray-500 mb-6">
        Every super-admin action is logged here for accountability.
      </p>

      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">{error}</div>}

      <div className="bg-white border border-gray-200 border-t-[3px] border-t-oem-red rounded-[10px] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th>When</Th>
              <Th>Super admin</Th>
              <Th>Action</Th>
              <Th>Target org</Th>
              <Th>Resource</Th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">Loading…</td></tr>}
            {!loading && entries.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">No actions logged yet.</td></tr>
            )}
            {!loading && entries.map((e) => (
              <tr key={e.id} className="border-b border-gray-100 last:border-0">
                <Td className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(e.created_at)}</Td>
                <Td className="font-medium">{e.super_admin_name}</Td>
                <Td>{ACTION_LABELS[e.action] || e.action}</Td>
                <Td>
                  {e.target_org_id && e.target_org_name ? (
                    <Link href={`/admin/orgs/${e.target_org_id}`} className="text-oem-red hover:underline">
                      {e.target_org_name}
                    </Link>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </Td>
                <Td className="text-xs text-gray-500 font-mono">{e.target_resource || '—'}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="text-left px-3.5 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3.5 py-3 align-middle ${className}`}>{children}</td>;
}
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
