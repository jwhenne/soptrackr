import Link from 'next/link';
import InviteAcceptClient from './InviteAcceptClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Accept invitation — SOPTrackr',
};

export default function InvitePage({ params }: { params: { token: string } }) {
  return (
    <div className="font-lexend min-h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col">
      <header className="py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="SOPTrackr home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-full.svg" alt="SOPTrackr" className="h-9 w-auto" />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-12">
        <InviteAcceptClient token={params.token} />
      </main>
    </div>
  );
}
