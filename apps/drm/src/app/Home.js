import Link from 'next/link';
import { MotifField, Conch, Lotus, Bell, Flute } from './Motifs';

const RANK = { view_only: 0, data_entry: 1, module_manager: 2, super_admin: 3 };

/**
 * Śrīmad-Bhāgavatam 1.2.17.
 *
 * Kept as data rather than markup so the Devanagari, the transliteration and
 * the translation stay together and cannot drift apart in an edit. Line breaks
 * are the verse's own — this is scripture, not prose to be reflowed.
 */
const VERSE = {
  devanagari: [
    'शृण्वतां स्वकथाः कृष्णः पुण्यश्रवणकीर्तनः ।',
    'हृद्यन्तःस्थो ह्यभद्राणि विधुनोति सुहृत्सताम् ॥',
  ],
  iast: [
    'śṛṇvatāṁ sva-kathāḥ kṛṣṇaḥ',
    'puṇya-śravaṇa-kīrtanaḥ',
    'hṛdy antaḥ-stho hy abhadrāṇi',
    'vidhunoti suhṛt satām',
  ],
  translation:
    'Śrī Kṛṣṇa, the Personality of Godhead, who is the Paramātmā in everyone’s heart '
    + 'and the benefactor of the truthful devotee, cleanses the desire for material '
    + 'enjoyment from the heart of the devotee who relishes His messages, which are in '
    + 'themselves virtuous when properly heard and chanted.',
  source: 'Śrīmad-Bhāgavatam 1.2.17',
  translator: 'His Divine Grace A. C. Bhaktivedanta Swami Prabhupāda',
};

const PURPOSE = [
  { Icon: Conch, title: 'Hear about Kṛṣṇa', note: 'Śravaṇam — the verse begins here, and so does everything else.' },
  { Icon: Lotus, title: 'Stay connected with devotees', note: 'Suhṛt satām — the association that keeps devotional life alive.' },
  { Icon: Bell, title: 'Participate in programs', note: 'Festivals, ārati, courses, and the seva around them.' },
  { Icon: Flute, title: 'Deepen devotional service', note: 'Japa, study, and steady service, recorded so nobody is forgotten.' },
];

const MODULES = [
  { href: '/devotees', label: 'Devotees', note: 'The master record — search, edit, add.', minRank: 0 },
  { href: '/donations', label: 'Donations', note: 'Receipts, seva categories, messages, Zoho sync.', minRank: 0 },
  { href: '/seva', label: 'Seva ops', note: 'Day sheets for the pūjārīs and the kitchen.', minRank: 0 },
  { href: '/team', label: 'Team', note: 'Preachers and volunteers, and their referral links.', minRank: 0 },
  { href: '/insights', label: 'Insights', note: 'Trends, charts and exports.', minRank: 0 },
  { href: '/import', label: 'Import', note: 'Bring in a spreadsheet, one category at a time.', minRank: 2 },
];

export default function Home({ user }) {
  const rank = RANK[user.role] ?? 0;

  return (
    <div className="home">
      <MotifField />

      <div className="content home-inner">
        {/* The masthead lives in the nav bar. Repeating the logo and the app
            name here only pushed the verse below the fold. */}
        <section className="verse" aria-label={VERSE.source}>
          <div className="verse-deva" lang="sa">
            {VERSE.devanagari.map((l) => <div key={l}>{l}</div>)}
          </div>
          <div className="verse-iast">
            {VERSE.iast.map((l) => <div key={l}>{l}</div>)}
          </div>
          <p className="verse-tr">{VERSE.translation}</p>
          <p className="verse-src">
            {VERSE.source}
            <span> · translation by {VERSE.translator}</span>
          </p>
        </section>

        <section className="purpose">
          <div className="purpose-grid">
            {PURPOSE.map(({ Icon, title, note }) => (
              <div className="purpose-item" key={title}>
                <Icon className="purpose-icon" />
                <div>
                  <b>{title}</b>
                  <span>{note}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="home-h2">Where to go</h2>
          <div className="home-cards">
            {MODULES.filter((m) => rank >= m.minRank).map((m) => (
              <Link key={m.href} href={m.href} className="home-card">
                <b>{m.label}</b>
                <span>{m.note}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
