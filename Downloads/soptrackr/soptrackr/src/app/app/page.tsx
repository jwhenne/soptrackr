import { redirect } from 'next/navigation';
import { requireAccessibleOrg } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AppHome() {
  // Triggers redirect chain: /sign-in → /app/onboarding → /app/pending as needed
  await requireAccessibleOrg();
  redirect('/app/sops');
}
