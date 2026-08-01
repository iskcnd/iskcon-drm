import { currentUser } from '@/lib/session';
import Dashboard from './Dashboard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await currentUser();
  return <Dashboard user={{ name: user.name, role: user.role, email: user.email }} />;
}
