import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';

export const metadata = {
  title: 'Create account — SOPTrackr',
  description: 'Get your dealership started with SOPTrackr.',
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col">
      <header className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link href="/" aria-label="SOPTrackr home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-full.svg" alt="SOPTrackr" className="h-9 w-auto" />
          </Link>
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-primary-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <SignUp
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/app"
        />
      </main>
    </div>
  );
}
