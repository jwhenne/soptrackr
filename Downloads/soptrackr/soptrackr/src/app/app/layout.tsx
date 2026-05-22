import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import AppNav from '@/components/app/AppNav';
import { isCurrentUserSuperAdmin } from '@/lib/super-admin';
import { getCurrentUserOrgs } from '@/lib/auth';

export const metadata = {
  title: 'Dashboard — SOPTrackr',
  // Private, authenticated area — keep it out of search results.
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const isSuperAdmin = await isCurrentUserSuperAdmin();
  const orgs = await getCurrentUserOrgs();
  const org = orgs[0];

  return (
    <div className="font-lexend min-h-screen bg-gray-100 text-gray-900 flex flex-col">
      <header
        className="sticky top-0 z-30 bg-oem-yellow border-b-[3px] border-oem-red"
        style={{ height: 72 }}
      >
        <div className="h-full px-4 sm:px-6 grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center gap-4">
            <SyncIndicator />
          </div>
          <div className="flex items-center justify-center">
            <Link href="/app" className="flex items-center" aria-label="SOPTrackr home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-full.svg" alt="SOPTrackr" className="h-12 w-auto" />
            </Link>
          </div>
          <div className="flex items-center justify-end gap-3">
            {isSuperAdmin && (
              <Link
                href="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 bg-gray-950 text-white text-xs font-bold px-3 py-1.5 rounded-md hover:bg-gray-800 border border-oem-red"
                title="Switch to platform super admin"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-oem-yellow" />
                Super Admin
              </Link>
            )}
            <UserButton
              afterSignOutUrl="/"
              appearance={{ elements: { avatarBox: 'w-9 h-9' } }}
            />
          </div>
        </div>
      </header>

      {/* Past-due banner — shows on every /app page when payment is overdue */}
      {org && org.subscription_status === 'past_due' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm text-amber-900">
          <div className="max-w-[1200px] mx-auto flex items-center gap-2">
            <span>⚠</span>
            <span>
              <strong>Payment past due.</strong> Please contact{' '}
              <a href="mailto:sales@soptrackr.com" className="underline font-medium">
                sales@soptrackr.com
              </a>
              {' '}to keep your access uninterrupted.
            </span>
          </div>
        </div>
      )}

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <AppNav />
        </div>
      </div>

      <main className="flex-1">{children}</main>
    </div>
  );
}

function SyncIndicator() {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-gray-800">
      <span className="w-[7px] h-[7px] rounded-full bg-oem-red" />
      Live
    </div>
  );
}
