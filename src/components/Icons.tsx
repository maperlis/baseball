/**
 * Monochrome icons drawn with currentColor, so they inherit the active green
 * in the tab bar and the danger red on a delete button. Emoji were the quick
 * option but render in their own colours (and inconsistently across platforms),
 * which fights the palette.
 */
const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** Smaller variant for the dense row-action buttons. */
const small = { ...base, width: 17, height: 17, strokeWidth: 2 };

export function IconLineup() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M6.2 5.5a13 13 0 0 1 0 13" />
      <path d="M17.8 5.5a13 13 0 0 0 0 13" />
    </svg>
  );
}

export function IconGames() {
  return (
    <svg {...base}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconRoster() {
  return (
    <svg {...base}>
      <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" />
      <circle cx="10" cy="8" r="3.4" />
      <path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 4.7a3.4 3.4 0 0 1 0 6.6" />
    </svg>
  );
}

export function IconUp() {
  return (
    <svg {...small}>
      <path d="M12 19V6M6 12l6-6 6 6" />
    </svg>
  );
}

export function IconDown() {
  return (
    <svg {...small}>
      <path d="M12 5v13M18 12l-6 6-6-6" />
    </svg>
  );
}

export function IconEdit() {
  return (
    <svg {...small}>
      <path d="M13.5 5.5 18.5 10.5M4 20h4l11-11a2.6 2.6 0 0 0-3.7-3.7L4.3 16.3 4 20Z" />
    </svg>
  );
}

export function IconCopy() {
  return (
    <svg {...small}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h8" />
    </svg>
  );
}

export function IconDelete() {
  return (
    <svg {...small}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconDrag() {
  return (
    <svg {...small} strokeWidth={2.2}>
      <path d="M4 9h16M4 15h16" />
    </svg>
  );
}
