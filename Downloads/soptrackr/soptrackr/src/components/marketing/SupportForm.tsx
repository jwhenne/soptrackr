'use client';

import { useState } from 'react';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function SupportForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Something went wrong. Please email support@soptrackr.com.');
      }
      setStatus('success');
      form.reset();
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-white rounded-xl shadow border border-gray-200 p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mt-4 text-2xl font-bold text-gray-900">Got it — we&rsquo;ll be in touch.</h3>
        <p className="mt-2 text-gray-600">
          Your support request has been sent. We typically reply within one business day.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-6 text-primary-600 font-semibold hover:underline"
        >
          Send another →
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow border border-gray-200 p-6 sm:p-8 space-y-4"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Your name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label htmlFor="dealership" className="block text-sm font-medium text-gray-700 mb-1">
            Dealership <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="dealership"
            name="dealership"
            type="text"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          placeholder="e.g. Login issue, billing question, bug report"
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          placeholder="Tell us what's going on. The more detail, the faster we can help."
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-600">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full inline-flex items-center justify-center px-6 py-3 rounded-md bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-60 shadow-sm"
      >
        {status === 'submitting' ? 'Sending…' : 'Send support request'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Goes to support@soptrackr.com. We&rsquo;ll only use your info to respond.
      </p>
    </form>
  );
}
