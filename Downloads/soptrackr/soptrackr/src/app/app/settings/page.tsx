import { requireAccessibleOrg } from '@/lib/auth';
import SettingsView from './SettingsView';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Settings — SOPTrackr',
};

export default async function SettingsPage() {
  const { org } = await requireAccessibleOrg();
  return <SettingsView org={org} />;
}
