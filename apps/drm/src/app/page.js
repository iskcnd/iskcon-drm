import { currentUser } from '@/lib/session';
import Nav from './Nav';
import Home from './Home';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await currentUser();
  const u = { name: user.name, role: user.role, email: user.email };
  return (
    <div className="page">
      <Nav user={u} />
      <Home user={u} />
    </div>
  );
}
