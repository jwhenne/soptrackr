'use client';

import { useCallback, useEffect, useState } from 'react';
import type { OrgMembership } from '@/lib/auth';

type OrgSettings = {
  id: string;
  name: string;
  slug: string;
  groupme_bot_id: string | null;
  groupme_group_name: string | null;
};

export default function SettingsView({ org }: { org: OrgMembership }) {
  const canManage = org.role === 'admin' || org.role === 'manager';

  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [botIdDraft, setBotIdDraft] = useState('');
  const [groupNameDraft, setGroupNameDraft] = useState('');
  const [orgNameDraft, setOrgNameDraft] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'green' | 'red' } | null>(null);

  function showToast(msg: string, tone: 'green' | 'red' = 'green') {
    setToast({ msg, tone });
    window.setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/org/settings', { cache: 'no-store' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load settings');
      const data = (await res.json()) as { settings: OrgSettings };
      setSettings(data.settings);
      setBotIdDraft(data.settings.groupme_bot_id || '');
      setGroupNameDraft(data.settings.groupme_group_name || '');
      setOrgNameDraft(data.settings.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function saveOrgName(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/org/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgNameDraft.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      const data = (await res.json()) as { settings: OrgSettings };
      setSettings(data.settings);
      showToast('Organization name updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function saveGroupMe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/org/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupme_bot_id: botIdDraft.trim() || null,
          groupme_group_name: groupNameDraft.trim() || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      const data = (await res.json()) as { settings: OrgSettings };
      setSettings(data.settings);
      showToast('GroupMe settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setError(null);
    try {
      const res = await fetch('/api/org/test-groupme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_id: botIdDraft.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Test failed');
      showToast('Test message sent — check your GroupMe!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Test failed', 'red');
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto px-4 py-12 text-sm text-gray-500">Loading…</div>;
  }
  if (!settings) {
    return <div className="max-w-3xl mx-auto px-4 py-12 text-sm text-red-600">Could not load settings.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-oem-red">{org.org_name}</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Org name */}
      <Card title="Organization">
        {!canManage ? (
          <div className="text-sm text-gray-700">
            <strong>{settings.name}</strong>
            <p className="mt-1 text-xs text-gray-500">Only Admins and Managers can rename the organization.</p>
          </div>
        ) : (
          <form onSubmit={saveOrgName} className="space-y-3">
            <Field label="Organization name">
              <input
                type="text"
                value={orgNameDraft}
                onChange={(e) => setOrgNameDraft(e.target.value)}
                required
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:border-oem-red focus:outline-none focus:ring-2 focus:ring-oem-red/10"
              />
            </Field>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || orgNameDraft.trim() === settings.name}
                className="text-sm font-semibold px-4 py-2 bg-oem-red text-white rounded-lg hover:bg-oem-red-dark disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </Card>

      {/* GroupMe */}
      <Card title="GroupMe notifications" className="mt-6">
        {!canManage ? (
          <div className="text-sm text-gray-700">
            {settings.groupme_bot_id ? (
              <>
                <p>GroupMe is configured for this organization.</p>
                {settings.groupme_group_name && (
                  <p className="mt-1 text-xs text-gray-500">Group: {settings.groupme_group_name}</p>
                )}
              </>
            ) : (
              <p>No GroupMe bot is configured. Ask an admin to set one up.</p>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              When a part is marked <strong>arrived</strong> (and you click Notify BDC) or marked for <strong>return</strong>,
              SOPTrackr will post a message to your GroupMe so the whole team sees it instantly.
              {' '}
              <a
                href="https://dev.groupme.com/bots/new"
                target="_blank" rel="noopener noreferrer"
                className="text-oem-red font-medium hover:underline"
              >
                Create a new bot →
              </a>
            </p>
            <form onSubmit={saveGroupMe} className="space-y-3">
              <Field label="GroupMe bot ID">
                <input
                  type="text"
                  value={botIdDraft}
                  onChange={(e) => setBotIdDraft(e.target.value)}
                  placeholder="e.g. 06e8fbba959b429c84dcf83b07"
                  className="w-full text-sm px-3 py-2 font-mono border border-gray-300 rounded-lg focus:border-oem-red focus:outline-none focus:ring-2 focus:ring-oem-red/10"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Find this on dev.groupme.com under your bot. It&rsquo;s a long hex string. Leave empty to disable GroupMe.
                </p>
              </Field>
              <Field label="Group display name (optional)">
                <input
                  type="text"
                  value={groupNameDraft}
                  onChange={(e) => setGroupNameDraft(e.target.value)}
                  placeholder="e.g. Performance Toyota BDC"
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:border-oem-red focus:outline-none focus:ring-2 focus:ring-oem-red/10"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Just a label so you remember which group this bot points to. Not sent to GroupMe.
                </p>
              </Field>
              <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={sendTest}
                  disabled={testing || !botIdDraft.trim()}
                  className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  {testing ? 'Sending…' : 'Send test message'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="text-sm font-semibold px-4 py-2 bg-oem-red text-white rounded-lg hover:bg-oem-red-dark disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save GroupMe settings'}
                </button>
              </div>
            </form>
            {settings.groupme_bot_id && (
              <div className="mt-4 p-3 rounded-md bg-sop-arrived-bg text-sop-arrived-fg text-sm">
                ✓ GroupMe is connected{settings.groupme_group_name ? ` (${settings.groupme_group_name})` : ''}.
                Arrival + return alerts will be posted automatically.
              </div>
            )}
          </>
        )}
      </Card>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {toast && (
        <div className={
          'fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-semibold max-w-sm ' +
          (toast.tone === 'green' ? 'bg-[#27500A] text-[#EAF3DE]' : 'bg-[#791F1F] text-[#FCEBEB]')
        }>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 border-t-[3px] border-t-oem-yellow rounded-[10px] overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
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
