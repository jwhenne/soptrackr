'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const BRANDS = [
  'Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler', 'Dodge',
  'Ford', 'GMC', 'Genesis', 'Honda', 'Hyundai', 'Infiniti', 'Jaguar', 'Jeep',
  'Kia', 'Land Rover', 'Lexus', 'Lincoln', 'Mazda', 'Mercedes-Benz', 'Mini',
  'Mitsubishi', 'Nissan', 'Porsche', 'Ram', 'Subaru', 'Tesla', 'Toyota',
  'Volkswagen', 'Volvo', 'Other',
];

type Status = 'idle' | 'submitting' | 'error';

export default function OnboardingForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    const data = Object.fromEntries(new FormData(e.currentTarget).entries());

    try {
      const res = await fetch('/api/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Could not create your organization. Please try again.');
      }
      // Server-side redirect happens via router.push since the form action returned ok
      router.push('/app');
      router.refresh();
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Dealership or group name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={defaultName}
          placeholder="e.g. Performance Auto Group"
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Use the name your team would recognize. You can rename later.
        </p>
      </div>

      <div className="border-t border-gray-200 pt-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Your first rooftop</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="rooftop_name" className="block text-sm font-medium text-gray-700 mb-1">
              Rooftop name
            </label>
            <input
              id="rooftop_name"
              name="rooftop_name"
              type="text"
              required
              placeholder="e.g. Performance Toyota"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label htmlFor="rooftop_brand" className="block text-sm font-medium text-gray-700 mb-1">
              Brand
            </label>
            <select
              id="rooftop_brand"
              name="rooftop_brand"
              defaultValue=""
              className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              <option value="" disabled>Select…</option>
              {BRANDS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-4">
          <div className="sm:col-span-2">
            <label htmlFor="rooftop_city" className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              id="rooftop_city"
              name="rooftop_city"
              type="text"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label htmlFor="rooftop_state" className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <input
              id="rooftop_state"
              name="rooftop_state"
              type="text"
              maxLength={2}
              placeholder="PA"
              className="w-full rounded-md border border-gray-300 px-3 py-2 uppercase focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          You&rsquo;ll be added as the <strong>Admin</strong>. Add more rooftops and invite teammates after.
        </p>
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-600">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full inline-flex items-center justify-center px-6 py-3 rounded-md bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-60 shadow-sm"
      >
        {status === 'submitting' ? 'Setting up…' : 'Create dealership'}
      </button>
    </form>
  );
}
