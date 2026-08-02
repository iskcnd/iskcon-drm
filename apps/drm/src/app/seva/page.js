import { currentUser } from '@/lib/session';
import Nav from '../Nav';
import SevaClient from './SevaClient';

export const dynamic = 'force-dynamic';

export default async function SevaPage() {
  const user = await currentUser();
  return (
    <div className="page">
      <Nav user={{ name: user.name, role: user.role }} />
      <SevaClient />
    </div>
  );
}
