import { currentUser } from '@/lib/session';
import Nav from '../Nav';
import TeamClient from './TeamClient';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const user = await currentUser();
  return (
    <div className="page">
      <Nav user={{ name: user.name, role: user.role }} />
      <TeamClient role={user.role} />
    </div>
  );
}
