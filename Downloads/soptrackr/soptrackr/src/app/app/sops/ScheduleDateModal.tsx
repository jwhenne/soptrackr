'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  customerName: string;
  partDescription: string;
  initialDate?: string;
  onClose: () => void;
  onConfirm: (date: string) => void | Promise<void>;
};

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function ScheduleDateModal({
  customerName,
  partDescription,
  initialDate,
  onClose,
  onConfirm,
}: Props) {
  const [date, setDate] = useState<string>(initialDate || todayISO());
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!date || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(date);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={() => { if (!submitting) onClose(); }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl w-full max-w-[420px] my-4"
      >
        <h2 className="text-base font-semibold text-gray-900 px-6 pt-6 pb-1">
          Schedule install
        </h2>
        <p className="text-[13px] text-gray-500 px-6 pb-4">
          {customerName} — {partDescription}
        </p>

        <div className="px-6 pb-2">
          <label className="block">
            <span className="block text-xs text-gray-500 font-medium mb-1.5">
              Install date
            </span>
            <input
              ref={inputRef}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full text-[13px] px-2.5 py-2 border border-gray-300 rounded-lg bg-white outline-none focus:border-oem-red focus:ring-2 focus:ring-oem-red/10"
            />
          </label>
        </div>

        <div className="px-6 pt-4 pb-6 flex justify-end gap-2 border-t border-gray-200 mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-900 font-medium hover:bg-gray-100 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !date}
            className="px-4 py-1.5 text-sm bg-oem-red text-white font-semibold rounded-lg hover:bg-oem-red-dark disabled:opacity-60"
          >
            {submitting ? 'Scheduling…' : 'Mark scheduled'}
          </button>
        </div>
      </form>
    </div>
  );
}
