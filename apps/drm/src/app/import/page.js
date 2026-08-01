import { currentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import Nav from '../Nav';
import ImportClient from './ImportClient';

export const dynamic = 'force-dynamic';

export default async function ImportPage() {
  const user = await currentUser();
  const rank = { view_only: 0, data_entry: 1, module_manager: 2, super_admin: 3 }[user.role] ?? 0;
  if (rank < 2) redirect('/');

  return (
    <div className="page">
      <Nav user={{ name: user.name, role: user.role }} />
      <ImportClient />
    </div>
  );
}
