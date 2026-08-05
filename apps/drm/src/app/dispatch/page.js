import { currentUser } from '@/lib/session';
import Nav from '../Nav';
import DispatchClient from './DispatchClient';

export const dynamic = 'force-dynamic';

export default async function DispatchPage() {
  const user = await currentUser();
  return (
    <div className="page">
      <Nav user={{ name: user.name, role: user.role }} />
      <DispatchClient user={{ name: user.name, role: user.role }} />
    </div>
  );
}
