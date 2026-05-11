'use client';

import { useEffect, useState } from 'react';
import {
  SOP_STATUS_LABELS,
  SOP_STATUS_BADGE_CLASS,
  RETURN_WARNING_DAYS,
  type ContactLogRow,
  type SopRow,
  type SopStatus,
} from '@/lib/sops';

type Props = {
  sopId: string;
  onClose: () => void;
  onChanged: (msg?: string) => void | Promise<void>;
};

const RESULT_OPTIONS: Array<{ value: string; label: string; cls: string }> = [
  { value: 'no_answer',      label: 'No answer',         cls: 'bg-sop-installed-bg text-sop-installed-fg' },
  { value: 'left_voicemail', label: 'Left voicemail',    cls: 'bg-sop-transit-bg text-sop-transit-fg' },
  { value: 'spoke',          label: 'Reached customer',  cls: 'bg-sop-arrived-bg text-sop-arrived-fg' },
  { value: 'scheduled',      label: 'Appt scheduled',    cls: 'bg-sop-notified-bg text-sop-notified-fg' },
];

export default function SopDetailPanel({ sopId, onClose, onChanged }: Props) {
  const [sop, setSop] = useState<SopRow | null>(null);
  const [contacts, setContacts] = useState<ContactLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline-edit toggles
  const [editingEta, setEditingEta] = useState(false);
  const [etaDraft, setEtaDraft] = useState('');
  const [editingStaying, setEditingStaying] = useState(false);
  const [stayingDraft, setStayingDraft] = useState<'yes' | 'no' | ''>('');

  // Reload on open / id change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/sops/${sopId}`, { cache: 'no-store' });
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to load detail');
        const data = (await res.json()) as { sop: SopRow; contactLog: ContactLogRow[] };
        if (cancelled) return;
        setSop(data.sop);
        setContacts(data.contactLog);
        setEtaDraft(data.sop.eta || '');
        setStayingDraft(data.sop.vehicle_staying === true ? 'yes' : data.sop.vehicle_staying === false ? 'no' : '');
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sopId]);

  async function patch(body: Record<string, unknown>): Promise<SopRow | null> {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sops/${sopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(e.error || 'Update failed');
      }
      const json = (await res.json()) as { sop: SopRow };
      setSop(json.sop);
      return json.sop;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function saveEta() {
    if (!etaDraft) { setError('Please select a date.'); return; }
    const r = await patch({ eta: etaDraft });
    if (r) { setEditingEta(false); await onChanged('ETA updated'); }
  }
  async function saveStaying() {
    const r = await patch({ vehicle_staying: stayingDraft });
    if (r) { setEditingStaying(false); await onChanged('Vehicle staying updated'); }
  }

  async function changeStatus(s: SopStatus, extra: Record<string, unknown> = {}) {
    if (s === 'scheduled') {
      const date = window.prompt('Enter scheduled install date (YYYY-MM-DD):');
      if (!date) return;
      extra = { ...extra, scheduled_at: date };
    }
    if (s === 'installed' && !window.confirm(`Mark installed for ${sop?.customer_name}?`)) return;
    if (s === 'complete' && !window.confirm(`Mark job complete for ${sop?.customer_name}?`)) return;
    if (s === 'returned') {
      const days = sop?.days_since_arrived ?? 0;
      if (!window.confirm(`Mark this part for return?\n\nCustomer: ${sop?.customer_name}\nPart: ${sop?.part_description}\nDays since arrival: ${days}`)) return;
      extra = { ...extra, return_reason: `Returned after ${days} days`, status_note: `Returned after ${days} days` };
    }
    if (s === 'notified') extra = { ...extra, notified_to_bdc: true };
    const r = await patch({ status: s, ...extra });
    if (r) await onChanged(`Status changed to ${SOP_STATUS_LABELS[s]}`);
  }

  async function deleteSop() {
    if (!sop) return;
    if (!window.confirm('Delete this order? This cannot be undone.')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/sops/${sopId}`, { method: 'DELETE' });
      if (!res.ok) {
        const e = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(e.error || 'Delete failed');
      }
      await onChanged('Order deleted');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setSaving(false);
    }
  }

  async function logContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const note = (fd.get('note') as string)?.trim();
    const outcome = fd.get('outcome') as string;

    if (!note) {
      setError('Please enter a note before logging.');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/sops/${sopId}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'phone',
          outcome,
          note,
        }),
      });
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(e.error || 'Could not log contact');
      }
      const data = (await res.json()) as { entry: ContactLogRow };
      // The API uses the logged-in user's name, but if they typed a different
      // name in the "by" box, surface it in the note.
      setContacts((prev) => [data.entry, ...prev]);
      form.reset();
      await onChanged('Contact attempt logged');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log contact');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !sop) {
    return (
      <Modal onClose={onClose}>
        <div className="px-6 py-12 text-center text-sm text-gray-500">Loading…</div>
      </Modal>
    );
  }

  const days = sop.days_since_arrived;
  const stale = days !== null && days >= RETURN_WARNING_DAYS && sop.status !== 'installed' && sop.status !== 'returned' && sop.status !== 'complete';

  return (
    <Modal onClose={onClose}>
      <h2 className="text-base font-semibold text-gray-900 px-6 pt-6 pb-4">
        {sop.ro_number} — {sop.part_description}
      </h2>

      <div className="px-6 pb-3">
        {/* Top: Customer + Vehicle cards */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="text-[11px] text-gray-500 font-semibold mb-1">CUSTOMER</div>
            <div className="font-semibold">{sop.customer_name}</div>
            {sop.customer_phone && <div className="text-xs text-gray-500">{sop.customer_phone}</div>}
            {sop.customer_email && <div className="text-xs text-gray-500">{sop.customer_email}</div>}
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="text-[11px] text-gray-500 font-semibold mb-1">VEHICLE</div>
            <div className="font-semibold">{sop.vehicle || '—'}</div>
            <div className="text-xs text-gray-500">Advisor: {sop.advisor || '—'}</div>
          </div>
        </div>

        {/* Property table */}
        <table className="w-full text-[13px]">
          <tbody>
            <Row label="SOP number"><span className="font-bold text-oem-red">{sop.sop_number || '—'}</span></Row>
            <Row label="Part number"><span className="font-semibold">{sop.part_number || '—'}</span></Row>
            <Row label="Est. arrival">
              {editingEta ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="date" value={etaDraft} onChange={(e) => setEtaDraft(e.target.value)}
                    className="text-[13px] px-2 py-1 border border-oem-red rounded-md outline-none" />
                  <SmallBtn variant="primary" onClick={saveEta} disabled={saving}>Save</SmallBtn>
                  <SmallBtn onClick={() => { setEtaDraft(sop.eta || ''); setEditingEta(false); }}>Cancel</SmallBtn>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span>{sop.eta || '—'}</span>
                  <SmallBtn onClick={() => setEditingEta(true)}>Edit</SmallBtn>
                </div>
              )}
            </Row>
            <Row label="Date arrived">{formatDate(sop.arrived_at) || '—'}</Row>
            <Row label="BDC notified">{sop.notified_to_bdc ? 'Yes — alert sent' : 'No'}</Row>
            <Row label="Install appt">{formatDate(sop.scheduled_at) || '—'}</Row>
            <Row label="Backordered">
              {sop.backordered
                ? <span className="bg-sop-backordered-bg text-sop-backordered-fg border border-[#AFA9EC] px-2.5 py-0.5 rounded-full text-[11px] font-bold">Yes — Backordered</span>
                : 'No'}
            </Row>
            <Row label="Vehicle staying?">
              {editingStaying ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <select value={stayingDraft} onChange={(e) => setStayingDraft(e.target.value as '' | 'yes' | 'no')}
                    className="text-xs px-2 py-1 border border-oem-red rounded-md outline-none bg-white">
                    <option value="">— Select —</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                  <SmallBtn variant="primary" onClick={saveStaying} disabled={saving}>Save</SmallBtn>
                  <SmallBtn onClick={() => {
                    setStayingDraft(sop.vehicle_staying === true ? 'yes' : sop.vehicle_staying === false ? 'no' : '');
                    setEditingStaying(false);
                  }}>Cancel</SmallBtn>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  {stayingBadge(sop.vehicle_staying)}
                  <SmallBtn onClick={() => setEditingStaying(true)}>Edit</SmallBtn>
                </div>
              )}
            </Row>
            <Row label="Status">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${SOP_STATUS_BADGE_CLASS[sop.status]}`}>
                {SOP_STATUS_LABELS[sop.status]}
              </span>
            </Row>
            {sop.returned_at && <Row label="Return date">{formatDate(sop.returned_at)}</Row>}
            {stale && (
              <tr><td colSpan={2} className="py-2">
                <span className="bg-oem-yellow text-[#7a3800] px-2.5 py-1 rounded-md text-xs font-bold">
                  ⚠ Part has been here {days} days
                </span>
              </td></tr>
            )}
            {sop.notes && <Row label="Notes" valign="top"><span className="text-xs">{sop.notes}</span></Row>}
          </tbody>
        </table>
      </div>

      {/* BDC Contact Log */}
      <div className="px-6 mt-4 border-t-2 border-oem-yellow pt-4">
        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2.5">BDC Contact Log</div>

        {contacts.length === 0 ? (
          <div className="text-[13px] text-gray-400 py-1.5">No contact attempts logged yet.</div>
        ) : (
          <div className="space-y-2">
            {contacts.map((c) => {
              const opt = RESULT_OPTIONS.find((o) => o.value === c.outcome);
              return (
                <div key={c.id} className="bg-gray-50 border border-gray-200 border-l-[3px] border-l-oem-yellow rounded-md px-3 py-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-gray-700">{c.contacted_by_name || 'BDC'}</span>
                    <span className="text-[11px] text-gray-400">{formatDateTime(c.contacted_at)}</span>
                  </div>
                  {c.note && <div className="text-[13px] text-gray-700 leading-snug">{c.note}</div>}
                  {opt && (
                    <span className={`inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${opt.cls}`}>
                      {opt.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add contact form */}
        <form onSubmit={logContact} className="bg-[#FFFBEA] border border-oem-yellow rounded-lg p-3 mt-3">
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
            Log a contact attempt
          </label>
          <textarea
            name="note"
            placeholder="e.g. Left voicemail, customer called back, scheduled for Tue AM..."
            className="w-full text-[13px] px-2.5 py-2 border border-gray-300 rounded-md resize-y h-[70px] outline-none focus:border-oem-red mb-2"
          />
          <div className="flex gap-2 flex-wrap items-center">
            <select
              name="outcome"
              defaultValue="no_answer"
              className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-md bg-white outline-none focus:border-oem-red cursor-pointer"
            >
              {RESULT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button
              type="submit"
              disabled={saving}
              className="text-xs font-semibold px-3.5 py-1.5 bg-oem-red text-white rounded-md hover:bg-oem-red-dark disabled:opacity-60 ml-auto"
            >
              Log contact
            </button>
          </div>
        </form>
      </div>

      {error && <div className="px-6 pt-3 text-sm text-red-600">{error}</div>}

      {/* Footer */}
      <div className="px-6 py-4 mt-6 border-t border-gray-200 flex justify-end items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={deleteSop}
          disabled={saving}
          className="text-xs px-3 py-1.5 bg-[#FCEBEB] text-[#A32D2D] border border-[#F09595] rounded-md font-medium hover:bg-[#F7C1C1] disabled:opacity-60"
        >
          Delete order
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-xs px-3 py-1.5 bg-white border border-gray-300 text-gray-900 rounded-md font-medium hover:bg-gray-50 ml-auto"
        >
          Close
        </button>
        {(sop.status === 'ordered' || sop.status === 'in_transit') && (
          <FooterBtn variant="arrived" onClick={() => changeStatus('arrived')} disabled={saving}>Mark as arrived</FooterBtn>
        )}
        {sop.status === 'arrived' && (
          <FooterBtn variant="groupme" onClick={() => changeStatus('notified')} disabled={saving}>Notify BDC</FooterBtn>
        )}
        {sop.status === 'notified' && (
          <FooterBtn variant="primary" onClick={() => changeStatus('scheduled')} disabled={saving}>Mark scheduled</FooterBtn>
        )}
        {sop.status === 'scheduled' && (
          <FooterBtn variant="default" onClick={() => changeStatus('installed')} disabled={saving}>Mark installed</FooterBtn>
        )}
        {sop.status === 'installed' && (
          <FooterBtn variant="complete" onClick={() => changeStatus('complete')} disabled={saving}>✓ Job complete</FooterBtn>
        )}
        {sop.arrived_at && sop.status !== 'returned' && sop.status !== 'installed' && sop.status !== 'complete' && (
          <FooterBtn variant="return" onClick={() => changeStatus('returned')} disabled={saving}>Return part</FooterBtn>
        )}
      </div>
    </Modal>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-[640px] my-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function Row({ label, children, valign }: { label: string; children: React.ReactNode; valign?: 'top' }) {
  return (
    <tr>
      <td className={`py-1.5 text-gray-500 w-[40%] ${valign === 'top' ? 'align-top' : ''}`}>{label}</td>
      <td className="py-1.5">{children}</td>
    </tr>
  );
}

function SmallBtn({ children, onClick, variant = 'default', disabled }: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'primary';
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        'text-[11px] px-2 py-1 rounded-md font-medium border transition active:scale-95 disabled:opacity-60 ' +
        (variant === 'primary'
          ? 'bg-oem-red text-white border-oem-red hover:bg-oem-red-dark'
          : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100')
      }
    >
      {children}
    </button>
  );
}

function FooterBtn({ children, onClick, variant, disabled }: {
  children: React.ReactNode;
  onClick: () => void;
  variant: 'default' | 'primary' | 'arrived' | 'groupme' | 'complete' | 'return';
  disabled?: boolean;
}) {
  const cls: Record<typeof variant, string> = {
    default:  'bg-white text-gray-900 border-gray-300 hover:bg-gray-100',
    primary:  'bg-oem-red text-white border-oem-red hover:bg-oem-red-dark',
    arrived:  'bg-[#FFF8DC] text-[#7a5800] border-oem-yellow hover:bg-[#FFE890]',
    groupme:  'bg-[#00AFF0] text-white border-[#00AFF0] hover:bg-[#0090C8]',
    complete: 'bg-[#27500A] text-white border-[#27500A] hover:bg-[#1d3d05]',
    return:   'bg-[#EAF3DE] text-[#3B6D11] border-[#C0DD97] hover:bg-[#d6ebbb]',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={'text-xs px-3 py-1.5 rounded-md border font-medium whitespace-nowrap transition active:scale-95 disabled:opacity-60 ' + cls[variant]}
    >
      {children}
    </button>
  );
}

function stayingBadge(v: boolean | null) {
  if (v === true) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sop-staying-bg text-sop-staying-fg">Yes</span>;
  if (v === false) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sop-not-staying-bg text-sop-not-staying-fg">No</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sop-unknown-bg text-sop-unknown-fg">—</span>;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString();
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}
