import { redirect } from 'next/navigation';
import { getCurrentDbUser, getCurrentUserOrgs } from '@/lib/auth';
import OnboardingForm from './OnboardingForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Set up your dealership — SOPTrackr',
};

export default async function OnboardingPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect('/sign-in');

  const orgs = await getCurrentUserOrgs();
  if (orgs.length > 0) redirect('/app');

  const suggestedName = user.first_name
    ? `${user.first_name}'s Dealership`
    : '';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">
          One quick step
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900">
          Set up your dealership
        </h1>
        <p className="mt-3 text-gray-600 max-w-xl mx-auto">
          Tell us about your store. You can add more rooftops and invite teammates after.
        </p>
      </div>

      <OnboardingForm defaultName={suggestedName} />
    </div>
  );
}
