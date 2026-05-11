import { requireAccessibleOrg, getOrgMembers } from '@/lib/auth';
import TeamView from './TeamView';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Team — SOPTrackr',
};

export default async function TeamPage() {
  const { user, org } = await requireAccessibleOrg();
  const members = await getOrgMembers(org.org_id);
  return <TeamView org={org} members={members} currentUserId={user.id} />;
}
