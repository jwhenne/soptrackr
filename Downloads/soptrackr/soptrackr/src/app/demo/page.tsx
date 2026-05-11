'use client';

import { useState } from 'react';
import Header from '@/components/marketing/Header';
import Footer from '@/components/marketing/Footer';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function DemoPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Something went wrong. Please email sales@soptrackr.com.');
      }
      setStatus('success');
      form.reset();
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-primary-50 to-white py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">Book a demo</p>
              <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold text-gray-900">
                See SOPTrackr in your store.
              </h1>
              <p className="mt-6 text-lg text-gray-600">
                15 minutes. No slide deck. We&rsquo;ll walk through the live workflow on real special-order data — and answer anything you throw at us.
              </p>

              <ul className="mt-8 space-y-3 text-gray-700">
                {[
                  'Live demo of the SOP pipeline',
                  'Bin-location security walkthrough',
                  'Multi-rooftop reporting',
                  'Pricing & pilot terms',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>

              <p className="mt-8 text-sm text-gray-500">
                Prefer email? Reach us at{' '}
                <a href="mailto:sales@soptrackr.com" className="text-primary-600 font-medium hover:underline">
                  sales@soptrackr.com
                </a>
              </p>
            </div>

            <div>
              <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 sm:p-8">
                {status === 'success' ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-gray-900">Got it — talk soon.</h2>
                    <p className="mt-2 text-gray-600">
                      We&rsquo;ll be in touch within one business day to schedule your demo.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
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
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                          Role / title
                        </label>
                        <input
                          id="title"
                          name="title"
                          type="text"
                          placeholder="Service Director, Fixed Ops, etc."
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="dealership" className="block text-sm font-medium text-gray-700 mb-1">
                        Dealership / group
                      </label>
                      <input
                        id="dealership"
                        name="dealership"
                        type="text"
                        required
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                          Work email
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
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                          Phone
                        </label>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="rooftops" className="block text-sm font-medium text-gray-700 mb-1">
                        # of rooftops
                      </label>
                      <select
                        id="rooftops"
                        name="rooftops"
                        defaultValue=""
                        className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="" disabled>Select…</option>
                        <option value="1">1</option>
                        <option value="2-5">2–5</option>
                        <option value="6-15">6–15</option>
                        <option value="16+">16+</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                        Anything specific you want to see? (optional)
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        rows={3}
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
                      {status === 'submitting' ? 'Sending…' : 'Request demo'}
                    </button>

                    <p className="text-xs text-gray-500 text-center">
                      We&rsquo;ll only use your info to schedule your demo. No spam, ever.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
