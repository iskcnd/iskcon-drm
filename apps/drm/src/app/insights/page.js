import { currentUser } from '@/lib/session';
import Nav from '../Nav';
import InsightsClient from './InsightsClient';

export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  const user = await currentUser();
  return (
    <div className="page">
      <Nav user={{ name: user.name, role: user.role }} />
      <InsightsClient role={user.role} />
    </div>
  );
}
