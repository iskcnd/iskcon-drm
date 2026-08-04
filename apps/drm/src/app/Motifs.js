/**
 * Devotional line-art motifs for the home screen.
 *
 * These are decoration, not information: every one is aria-hidden and drawn in
 * currentColor at low opacity so it reads as watermark, never as content. Kept
 * as inline SVG rather than image files so they inherit the page's colour and
 * cost no extra request — the staff app is used on temple wifi.
 *
 * All are drawn on a 100x100 box with stroke widths tuned for that scale.
 */

const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function Svg({ children, ...rest }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" {...rest}>
      <g {...S}>{children}</g>
    </svg>
  );
}

/** Mandala — concentric petal rings. */
export function Mandala(props) {
  const petals = Array.from({ length: 12 }, (_, i) => i * 30);
  const beads = Array.from({ length: 24 }, (_, i) => (i * 15 * Math.PI) / 180);
  return (
    <Svg {...props}>
      {petals.map((a) => (
        <path
          key={a}
          d="M50 50 C43 35, 43 22, 50 13 C57 22, 57 35, 50 50 Z"
          transform={`rotate(${a} 50 50)`}
        />
      ))}
      {petals.map((a) => (
        <path
          key={`i${a}`}
          d="M50 50 C46 43, 46 37, 50 32 C54 37, 54 43, 50 50 Z"
          transform={`rotate(${a + 15} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="7" />
      <circle cx="50" cy="50" r="3" />
      <circle cx="50" cy="50" r="41" />
      <circle cx="50" cy="50" r="45" />
      {beads.map((t, i) => (
        <circle key={i} cx={50 + 43 * Math.cos(t)} cy={50 + 43 * Math.sin(t)} r="1.6" />
      ))}
    </Svg>
  );
}

/** Śaṅkha — the conch: pointed whorl at one end, flared opening at the other. */
export function Conch(props) {
  return (
    <Svg {...props}>
      <path d="M86 16 C90 32, 85 52, 72 67 C59 82, 41 91, 20 93 C24 78, 29 65, 38 52 C49 35, 67 23, 86 16 Z" />
      <path d="M78 22 C80 30, 78 38, 73 45" />
      <path d="M70 28 C72 34, 71 40, 67 45" />
      <path d="M62 35 C64 39, 63 44, 60 47" />
      <ellipse cx="31" cy="80" rx="11" ry="7" transform="rotate(-38 31 80)" />
      <path d="M46 60 C41 68, 36 77, 32 87" />
    </Svg>
  );
}

/** Vaṁśī — Kṛṣṇa's flute. */
export function Flute(props) {
  const holes = [30, 39, 48, 57, 66, 75];
  return (
    <Svg {...props}>
      <g transform="rotate(-28 50 50)">
        <rect x="9" y="44" width="82" height="12" rx="6" />
        <path d="M17 44 L17 56" />
        <path d="M84 44 L84 56" />
        <circle cx="24" cy="50" r="1.8" />
        {holes.map((x) => <circle key={x} cx={x} cy="50" r="2.2" />)}
      </g>
    </Svg>
  );
}

/** Ghaṇṭā — the ārati bell. */
export function Bell(props) {
  return (
    <Svg {...props}>
      <path d="M44 20 a6 6 0 0 1 12 0" />
      <path d="M50 20 L50 24" />
      <path d="M50 24 C36 28, 30 42, 28 55 C27 63, 24 69, 20 73 L80 73 C76 69, 73 63, 72 55 C70 42, 64 28, 50 24 Z" />
      <path d="M20 73 L80 73" />
      <circle cx="50" cy="81" r="5" />
      <path d="M50 73 L50 76" />
    </Svg>
  );
}

/** Padma — the lotus. */
export function Lotus(props) {
  return (
    <Svg {...props}>
      {[0, -26, 26, -52, 52].map((a) => (
        <path
          key={a}
          d="M50 82 C41 62, 41 40, 50 24 C59 40, 59 62, 50 82 Z"
          transform={`rotate(${a} 50 82)`}
        />
      ))}
      <path d="M50 82 C34 78, 22 70, 16 60 C28 58, 41 68, 50 82 Z" />
      <path d="M50 82 C66 78, 78 70, 84 60 C72 58, 59 68, 50 82 Z" />
      <path d="M28 86 C38 92, 62 92, 72 86" />
    </Svg>
  );
}

/**
 * The wash of motifs behind the page.
 *
 * Positions are deliberately off-grid and in the margins — a watermark that
 * lands behind a paragraph makes the paragraph harder to read, which is the
 * opposite of what decoration is for.
 */
export function MotifField() {
  return (
    <div className="motifs" aria-hidden="true">
      <Mandala className="m m1" />
      <Conch className="m m2" />
      <Lotus className="m m3" />
      <Flute className="m m4" />
      <Bell className="m m5" />
      <Mandala className="m m6" />
      <Lotus className="m m7" />
    </div>
  );
}
