'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SignedIn, SignedOut, useUser } from '@clerk/nextjs';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  parts_consultant: 'Parts Consultant',
  service_advisor: 'Service Advisor',
  technician: 'Technician',
};

type LookupOk = {
  status: 'pending';
  orgName: string;
  email: string;
  role: string;
  expiresAt: string;
};
type LookupAccepted = { status: 'accepted'; orgName?: string };
type LookupExpired  = { status: 'expired';  orgName?: string };
type LookupNotFound = { error: string };

type LookupResult = LookupOk | LookupAccepted | LookupExpired | LookupNotFound;

export default function InviteAcceptClient({ token }: { token: string }) {
  const router = useRouter();
  const { user } = useUser();
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/invitations/by-token/${encodeURIComponent(token)}`, { cache: 'no-store' });
        const data = (await res.json()) as LookupResult;
        if (!cancelled) setLookup(data);
      } catch {
        if (!cancelled) setLookup({ error: 'Could not load invitation' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Could not accept invitation');
      }
      router.push('/app/sops');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setAccepting(false);
    }
  }

  if (loading) {
    return <Card><p className="text-sm text-gray-500">Loading your invitation…</p></Card>;
  }

  if (!lookup) {
    return <Card><p className="text-sm text-red-600">Could not load invitation.</p></Card>;
  }

  if ('error' in lookup) {
    return (
      <Card>
        <h1 className="text-2xl font-extrabold text-gray-900">Invitation not found</h1>
        <p className="mt-3 text-gray-600">
          This invitation link is invalid. Double-check the URL or ask whoever sent it to send a new one.
        </p>
        <p className="mt-6 text-sm text-gray-500">
          <Link href="/" className="text-primary-600 font-semibold hover:underline">← Back to soptrackr.com</Link>
        </p>
      </Card>
    );
  }

  if (lookup.status === 'accepted') {
    return (
      <Card>
        <h1 className="text-2xl font-extrabold text-gray-900">Already accepted</h1>
        <p className="mt-3 text-gray-600">
          This invitation to <strong>{lookup.orgName}</strong> has already been accepted.
        </p>
        <p className="mt-6">
          <Link href="/app" className="inline-flex items-center px-5 py-2 rounded-md bg-primary-600 text-white font-semibold hover:bg-primary-700">
            Go to dashboard
          </Link>
        </p>
      </Card>
    );
  }

  if (lookup.status === 'expired') {
    return (
      <Card>
        <h1 className="text-2xl font-extrabold text-gray-900">Invitation expired</h1>
        <p className="mt-3 text-gray-600">
          This invitation to <strong>{lookup.orgName}</strong> has expired. Ask the team admin to send you a new one.
        </p>
      </Card>
    );
  }

  // status === 'pending'
  const roleLabel = ROLE_LABELS[lookup.role] || lookup.role;

  return (
    <Card>
      <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">You&rsquo;re invited</p>
      <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900">
        Join {lookup.orgName} on SOPTrackr
      </h1>
      <p className="mt-3 text-gray-600">
        You&rsquo;ll join as a <strong>{roleLabel}</strong> using <strong>{lookup.email}</strong>.
      </p>

      <SignedOut>
        <div className="mt-6 p-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700">
          You need an account to accept. Sign in if you already have one, or create a new account.
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/sign-up?redirect_url=${encodeURIComponent(`/invite/${token}`)}`}
            className="inline-flex items-center px-5 py-2 rounded-md bg-primary-600 text-white font-semibold hover:bg-primary-700"
          >
            Create account
          </Link>
          <Link
            href={`/sign-in?redirect_url=${encodeURIComponent(`/invite/${token}`)}`}
            className="inline-flex items-center px-5 py-2 rounded-md border border-gray-300 text-gray-900 font-semibold hover:bg-gray-50"
          >
            Sign in
          </Link>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Use the email <strong>{lookup.email}</strong> when creating your account so we can match it to this invite.
        </p>
      </SignedOut>

      <SignedIn>
        {user && user.primaryEmailAddress?.emailAddress.toLowerCase() !== lookup.email.toLowerCase() && (
          <div className="mt-6 p-3 rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-900">
            You&rsquo;re signed in as <strong>{user.primaryEmailAddress?.emailAddress}</strong>, but this invite was sent to <strong>{lookup.email}</strong>. You can still accept and join — your current account will be added to {lookup.orgName}.
          </div>
        )}
        <button
          type="button"
          onClick={handleAccept}
          disabled={accepting}
          className="mt-6 inline-flex items-center px-5 py-2.5 rounded-md bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-60"
        >
          {accepting ? 'Joining…' : `Accept & join ${lookup.orgName}`}
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </SignedIn>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8 w-full max-w-xl">
      {children}
    </div>
  );
}
