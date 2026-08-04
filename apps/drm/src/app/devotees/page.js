import { currentUser } from '@/lib/session';
import Nav from '../Nav';
import Dashboard from '../Dashboard';

export const dynamic = 'force-dynamic';

/**
 * The devotee master table. This used to be the landing page; signing in now
 * opens the home screen instead, because dropping a volunteer straight into a
 * spreadsheet of every devotee tells them nothing about what to do next.
 */
export default async function DevoteesPage() {
  const user = await currentUser();
  const u = { name: user.name, role: user.role, email: user.email };
  return (
    <>
      <Nav user={u} />
      <Dashboard user={u} />
    </>
  );
}
