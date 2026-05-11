import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentDbUser, getCurrentUserOrgs, isOrgAccessible } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const STATUS_COPY: Record<string, { title: string; body: string; tone: 'amber' | 'red' | 'gray' }> = {
  pending: {
    title: 'Account pending activation',
    body: 'Your dealership has been registered. Our team is preparing your first invoice in QuickBooks. Once payment is received, your account will be activated and your team will get full access. Most accounts are activated within one business day.',
    tone: 'amber',
  },
  suspended: {
    title: 'Account suspended',
    body: 'Your account has been temporarily suspended. This usually happens when a payment issue needs attention. Please contact us so we can get you back up and running quickly.',
    tone: 'red',
  },
  cancelled: {
    title: 'Account cancelled',
    body: 'Your subscription has been cancelled. Your historical data is preserved. If you\'d like to reactivate, just get in touch.',
    tone: 'gray',
  },
};

export default async function AppPendingPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect('/sign-in');

  const orgs = await getCurrentUserOrgs();
  if (orgs.length === 0) redirect('/app/onboarding');

  const org = orgs[0];

  // If they're actually active, kick them back to the dashboard
  if (isOrgAccessible(org.subscription_status)) {
    redirect('/app/sops');
  }

  const copy = STATUS_COPY[org.subscription_status] || STATUS_COPY.pending;
  const toneClasses =
    copy.tone === 'red'
      ? 'border-red-200 bg-red-50 text-red-900'
      : copy.tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-gray-200 bg-gray-50 text-gray-700';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className={`rounded-xl border p-8 ${toneClasses}`}>
        <p className="text-xs font-semibold uppercase tracking-wider opacity-75">
          {org.org_name}
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold">{copy.title}</h1>
        <p className="mt-4 text-base leading-relaxed">{copy.body}</p>

        <div className="mt-6 pt-6 border-t border-current/20 text-sm">
          <p className="font-semibold">Need to reach us?</p>
          <p className="mt-1">
            Email{' '}
            <a href="mailto:sales@soptrackr.com" className="underline font-medium">
              sales@soptrackr.com
            </a>
            {' '}or{' '}
            <a href="mailto:support@soptrackr.com" className="underline font-medium">
              support@soptrackr.com
            </a>
            .
          </p>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-gray-500">
        Signed in as {user.email}.{' '}
        <Link href="/sign-out" className="underline">Sign out</Link>
      </p>
    </div>
  );
}
