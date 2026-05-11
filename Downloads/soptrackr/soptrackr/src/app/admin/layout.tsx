import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { getSuperAdminContext } from '@/lib/super-admin';
import AdminNav from '@/components/admin/AdminNav';

export const metadata = {
  title: 'Super Admin — SOPTrackr',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSuperAdminContext();
  if (!ctx) {
    // Authenticated by middleware but not a super admin → bounce to /app
    redirect('/app');
  }

  return (
    <div className="font-lexend min-h-screen bg-gray-100 text-gray-900 flex flex-col">
      {/* Top bar — distinctive black w/ red accent so you always know you're in admin */}
      <header className="sticky top-0 z-30 bg-gray-950 text-white border-b-[3px] border-oem-red" style={{ height: 64 }}>
        <div className="h-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" aria-label="Super admin home" className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.svg" alt="SOPTrackr" className="h-8 w-8" />
              <div className="leading-tight">
                <div className="font-bold text-sm">SOPTrackr</div>
                <div className="text-[10px] uppercase tracking-wider text-oem-yellow">Super Admin</div>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/app/sops" className="text-xs text-gray-300 hover:text-white">← Back to your dealership</Link>
            <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <AdminNav />
        </div>
      </div>

      <main className="flex-1">{children}</main>
    </div>
  );
}
