import OrgDetail from './OrgDetail';

export const dynamic = 'force-dynamic';

export default function AdminOrgPage({ params }: { params: { id: string } }) {
  return <OrgDetail orgId={params.id} />;
}
