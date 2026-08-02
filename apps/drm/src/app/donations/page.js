import { currentUser } from '@/lib/session';
import Nav from '../Nav';
import DonationsClient from './DonationsClient';

export const dynamic = 'force-dynamic';

export default async function DonationsPage() {
  const user = await currentUser();
  return (
    <div className="page">
      <Nav user={{ name: user.name, role: user.role }} />
      <DonationsClient role={user.role} />
    </div>
  );
}
