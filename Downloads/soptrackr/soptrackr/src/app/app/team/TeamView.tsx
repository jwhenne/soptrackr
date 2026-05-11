'use client';

import { useCallback, useEffect, useState } from 'react';
import type { OrgMembership, OrgMember } from '@/lib/auth';

const ROLES = [
  { value: 'admin',            label: 'Admin' },
  { value: 'manager',          label: 'Manager' },
  { value: 'parts_consultant', label: 'Parts Consultant' },
  { value: 'service_advisor',  label: 'Service Advisor' },
  { value: 'technician',       label: 'Technician' },
] as const;

const ROLE_BADGE: Record<string, string> = {
  admin:            'bg-oem-red text-white',
  manager:          'bg-sop-notified-bg text-sop-notified-fg',
  parts_consultant: 'bg-sop-arrived-bg text-sop-arrived-fg',
  service_advisor:  'bg-sop-transit-bg text-sop-transit-fg',
  technician:       'bg-sop-installed-bg text-sop-installed-fg',
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  invited_by_name: string | null;
  token: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
};

type Props = {
  org: OrgMembership;
  members: OrgMember[];
  currentUserId: string;
};

export default function TeamView({ org, members, currentUserId }: Props) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const canManage = org.role === 'admin' || org.role === 'manager';

  const loadInvitations = useCallback(async () => {
    setLoadingInvites(true);
    try {
      const res = await fetch('/api/invitations', { cache: 'no-store' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load invitations');
      const data = (await res.json()) as { invitations: Invitation[] };
      setInvitations(data.invitations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitations');
    } finally {
      setLoadingInvites(false);
    }
  }, []);

  useEffect(() => { void loadInvitations(); }, [loadInvitations]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3500);
  }

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInviting(true);
    setError(null);

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Could not send invitation');
      showToast(`Invited ${data.email as string}`);
      form.reset();
      await loadInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setInviting(false);
    }
  }

  async function revokeInvite(id: string, email: string) {
    if (!window.confirm(`Revoke the invitation to ${email}?`)) return;
    try {
      const res = await fetch(`/api/invitations/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to revoke');
      showToast(`Revoked invite for ${email}`);
      await loadInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard?.writeText(url).then(
      () => showToast('Invite link copied to clipboard'),
      () => showToast('Could not copy — link: ' + url)
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-oem-red">{org.org_name}</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Team</h1>
      </div>

      {/* Members card */}
      <div className="bg-white border border-gray-200 border-t-[3px] border-t-oem-yellow rounded-[10px] overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Members <span className="text-gray-400 font-normal">({members.length})</span>
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Joined</Th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email.split('@')[0];
              return (
                <tr key={m.user_id} className="border-b border-gray-100 last:border-0">
                  <Td className="font-medium">
                    {name}
                    {m.user_id === currentUserId && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                  </Td>
                  <Td className="text-gray-600">{m.email}</Td>
                  <Td>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${ROLE_BADGE[m.role] || 'bg-gray-100 text-gray-700'}`}>
                      {ROLES.find((r) => r.value === m.role)?.label || m.role}
                    </span>
                  </Td>
                  <Td className="text-xs text-gray-500">{formatDate(m.joined_at)}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pending invitations */}
      {canManage && (
        <div className="bg-white border border-gray-200 rounded-[10px] overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">
              Pending invitations <span className="text-gray-400 font-normal">({invitations.length})</span>
            </h2>
          </div>
          {loadingInvites ? (
            <div className="px-4 py-6 text-sm text-gray-500 text-center">Loading…</div>
          ) : invitations.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500 text-center">No pending invitations.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Invited by</Th>
                  <Th>Expires</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-100 last:border-0">
                    <Td className="font-medium">{inv.email}</Td>
                    <Td>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${ROLE_BADGE[inv.role] || 'bg-gray-100 text-gray-700'}`}>
                        {ROLES.find((r) => r.value === inv.role)?.label || inv.role}
                      </span>
                    </Td>
                    <Td className="text-xs text-gray-500">{inv.invited_by_name || '—'}</Td>
                    <Td className="text-xs text-gray-500">{formatDate(inv.expires_at)}</Td>
                    <Td className="text-right">
                      <div className="inline-flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => copyInviteLink(inv.token)}
                          className="text-xs px-2.5 py-1 rounded-md border border-gray-300 hover:bg-gray-50"
                        >
                          Copy link
                        </button>
                        <button
                          type="button"
                          onClick={() => revokeInvite(inv.id, inv.email)}
                          className="text-xs px-2.5 py-1 rounded-md bg-[#FCEBEB] text-[#A32D2D] border border-[#F09595] hover:bg-[#F7C1C1]"
                        >
                          Revoke
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Invite form */}
      {canManage && (
        <div className="bg-white border border-gray-200 rounded-[10px] overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Invite a teammate</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              They&rsquo;ll get an email with a link to create their account and join {org.org_name}.
            </p>
          </div>
          <form onSubmit={handleInvite} className="p-4 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2.5">
            <input
              name="email"
              type="email"
              required
              placeholder="teammate@dealership.com"
              className="text-sm px-3 py-2 border border-gray-300 rounded-lg focus:border-oem-red focus:outline-none focus:ring-2 focus:ring-oem-red/10"
            />
            <select
              name="role"
              defaultValue="service_advisor"
              className="text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white focus:border-oem-red focus:outline-none cursor-pointer"
            >
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="text-sm font-semibold px-4 py-2 bg-oem-red text-white rounded-lg hover:bg-oem-red-dark disabled:opacity-60"
            >
              {inviting ? 'Sending…' : 'Send invitation'}
            </button>
          </form>
        </div>
      )}

      {!canManage && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-sm text-amber-900">
          Only Admins and Managers can invite new teammates.
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-semibold bg-[#27500A] text-[#EAF3DE] max-w-sm">
          {toast}
        </div>
      )}
    </div>
  );
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
