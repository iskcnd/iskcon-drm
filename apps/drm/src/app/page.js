import { currentUser } from '@/lib/session';
import Nav from './Nav';
import Dashboard from './Dashboard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await currentUser();
  const u = { name: user.name, role: user.role, email: user.email };
  return (
    <>
      <Nav user={u} />
      <Dashboard user={u} />
    </>
  );
}
