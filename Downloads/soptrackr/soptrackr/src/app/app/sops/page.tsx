import { requireAccessibleOrg, getCurrentUserRooftops } from '@/lib/auth';
import SopsView from './SopsView';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'SOPs — SOPTrackr',
};

export default async function SopsPage() {
  const { user, org } = await requireAccessibleOrg();
  const rooftops = await getCurrentUserRooftops();

  return (
    <SopsView
      currentUser={{
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
      }}
      org={org}
      rooftops={rooftops}
    />
  );
}
