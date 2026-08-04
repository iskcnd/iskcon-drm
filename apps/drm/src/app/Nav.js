'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const ROLE_LABEL = {
  super_admin: 'Super admin', module_manager: 'Module manager',
  data_entry: 'Data entry', view_only: 'View only',
};

const ITEMS = [
  { href: '/', label: 'Home', minRank: 0 },
  { href: '/devotees', label: 'Devotees', minRank: 0 },
  { href: '/donations', label: 'Donations', minRank: 0 },
  { href: '/seva', label: 'Seva ops', minRank: 0 },
  { href: '/team', label: 'Team', minRank: 0 },
  { href: '/import', label: 'Import', minRank: 2 },
  { href: '/insights', label: 'Insights', minRank: 0 },
];

// Sibling apps on their own subdomains. Shown greyed until they exist, so the
// shape of the platform is visible from day one.
const APPS = [
  { label: 'Donations', host: 'donate', ready: false },
  { label: 'Events', host: 'events', ready: false },
  { label: 'Japa Desk', host: 'japa', ready: false },
  { label: 'Devotee portal', host: 'portal', ready: false },
];

const RANK = { view_only: 0, data_entry: 1, module_manager: 2, super_admin: 3 };

export default function Nav({ user }) {
  const path = usePathname();
  const rank = RANK[user.role] ?? 0;

  return (
    <div id="nav">
      <div className="nav-brand">
        <b>ISKCON Chennai</b>
        <span>Devotee Relationship Management</span>
      </div>

      <nav className="nav-items">
        {ITEMS.filter((i) => rank >= i.minRank).map((i) => (
          <Link key={i.href} href={i.href} className={'nav-link' + (path === i.href ? ' on' : '')}>
            {i.label}
          </Link>
        ))}
      </nav>

      <div className="nav-apps">
        <span className="nav-apps-label">Other apps</span>
        {APPS.map((a) => (
          <span key={a.host} className="nav-soon" title="Not built yet">{a.label}</span>
        ))}
      </div>

      <div className="nav-user">
        <span><b>{user.name}</b>{ROLE_LABEL[user.role]}</span>
        <button
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
          }}
        >Sign out</button>
      </div>
    </div>
  );
}
