'use client';

import { useState } from 'react';
import type { Rooftop } from '@/lib/auth';
import type { SopRow } from '@/lib/sops';

type Props = {
  rooftops: Rooftop[];
  defaultAdvisor?: string;
  onClose: () => void;
  onCreated: (sop: SopRow) => void | Promise<void>;
};

export default function CreateSopModal({ rooftops, defaultAdvisor, onClose, onCreated }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries()) as Record<string, FormDataEntryValue>;
    data.backordered = fd.get('backordered') === 'on' ? 'true' : 'false';

    try {
      const res = await fetch('/api/sops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          backordered: data.backordered === 'true',
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Could not create SOP');
      }
      const json = (await res.json()) as { sop: SopRow };
      await onCreated(json.sop);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto"
         onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-[520px] my-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-900 px-6 pt-6 pb-4">Add special order</h2>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3.5">
          <Field label="SOP number *" name="sop_number" required placeholder="e.g. SOP-2025-001" bold />

          {rooftops.length > 1 && (
            <FieldSelect label="Rooftop *" name="rooftop_id" required>
              {rooftops.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </FieldSelect>
          )}
          {rooftops.length === 1 && (
            <input type="hidden" name="rooftop_id" value={rooftops[0].id} />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="RO number *" name="ro_number" required placeholder="e.g. RO-25100" />
            <Field label="Part number" name="part_number" placeholder="e.g. 68412693AA" />
          </div>

          <Field label="Part description *" name="part_description" required placeholder="e.g. Front bumper cover" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Customer name *" name="customer_name" required placeholder="Full name" />
            <Field label="Customer phone" name="customer_phone" type="tel" placeholder="(555) 555-5555" />
          </div>

          <Field label="Customer email" name="customer_email" type="email" placeholder="customer@email.com" />
          <Field label="Vehicle" name="vehicle" placeholder="e.g. 2022 Jeep Grand Cherokee" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Estimated arrival" name="eta" type="date" />
            <Field label="Advisor *" name="advisor" required defaultValue={defaultAdvisor} placeholder="Advisor name" />
          </div>

          <label className="flex items-center gap-2.5 py-1.5 cursor-pointer">
            <input
              type="checkbox"
              name="backordered"
              className="w-[18px] h-[18px] accent-oem-red cursor-pointer"
            />
            <span className="text-sm font-semibold text-gray-900">Backordered</span>
            <span className="text-xs text-gray-500">— check if part is on backorder</span>
          </label>

          <FieldTextarea label="Notes" name="notes" placeholder="Special instructions..." />

          <FieldSelect label="Vehicle staying for install?" name="vehicle_staying">
            <option value="">— Select —</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </FieldSelect>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-900 font-medium hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-sm bg-oem-red text-white font-semibold rounded-lg hover:bg-oem-red-dark disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  'w-full text-[13px] px-2.5 py-2 border border-gray-300 rounded-lg bg-white outline-none focus:border-oem-red focus:ring-2 focus:ring-oem-red/10';
const labelClass = 'block text-xs text-gray-500 font-medium mb-1.5';

function Field({
  label, name, required, type = 'text', defaultValue, placeholder, bold,
}: {
  label: string; name: string; required?: boolean; type?: string;
  defaultValue?: string; placeholder?: string; bold?: boolean;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={inputClass + (bold ? ' font-semibold' : '')}
      />
    </label>
  );
}

function FieldSelect({ label, name, required, children }: { label: string; name: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <select name={name} required={required} className={inputClass + ' cursor-pointer'}>
        {children}
      </select>
    </label>
  );
}

function FieldTextarea({ label, name, placeholder }: { label: string; name: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <textarea name={name} rows={3} placeholder={placeholder} className={inputClass + ' resize-y h-20'} />
    </label>
  );
}
