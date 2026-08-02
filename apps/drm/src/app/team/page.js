import { currentUser } from '@/lib/session';
import Nav from '../Nav';
import TeamClient from './TeamClient';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const user = await currentUser();
  // Read from config, never hardcoded — the donation page currently lives on a
  // Railway domain and moves to donate.iskconchennai.org later. A referral link
  // built from the wrong host is worse than no link: it looks right and loses
  // the donor.
  const donateBase = (process.env.DONATE_BASE_URL || '').replace(/\/$/, '');
  return (
    <div className="page">
      <Nav user={{ name: user.name, role: user.role }} />
      <TeamClient role={user.role} donateBase={donateBase} />
    </div>
  );
}
