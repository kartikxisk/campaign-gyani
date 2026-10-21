/** On-brand line-art motif: an email on a hook — the heart of a phishing sim. */
export function PhishMark({ className, tone = 'brand' }: { className?: string; tone?: 'brand' | 'ink' }) {
  const ink = tone === 'ink';
  const hook = ink ? 'currentColor' : 'var(--cg-primary)';
  const line = ink ? 'currentColor' : 'var(--cg-deck-ink)';
  const lineOpacity = ink ? '0.9' : '0.55';
  return (
    <svg viewBox="0 0 220 180" fill="none" className={className} role="img" aria-label="An email on a hook">
      {/* hook line dropping from the top */}
      <path d="M150 8 C150 46 182 54 182 86 C182 112 158 120 146 134" stroke={hook} strokeWidth="2.5" strokeLinecap="round" />
      {/* hook curl */}
      <path d="M146 134 C140 142 150 150 158 144 C164 139 160 130 154 131" stroke={hook} strokeWidth="2.5" strokeLinecap="round" />
      {/* bait dot (the catch) */}
      <circle cx="154" cy="131" r="4.5" fill={ink ? 'currentColor' : 'var(--cg-submitted)'} />

      {/* envelope */}
      <rect x="26" y="70" width="128" height="86" rx="10" stroke={line} strokeOpacity={lineOpacity} strokeWidth="2.5" />
      {/* flap */}
      <path d="M30 80 L90 118 L150 80" stroke={line} strokeOpacity={lineOpacity} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* lines of text, fading */}
      <path d="M46 138 H118" stroke={line} strokeOpacity={ink ? '0.45' : '0.2'} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M46 146 H96" stroke={line} strokeOpacity={ink ? '0.3' : '0.14'} strokeWidth="2.5" strokeLinecap="round" />

      {/* signal dots rising — telemetry */}
      {!ink && <circle cx="186" cy="26" r="3" fill="var(--cg-opened)" />}
      {!ink && <circle cx="200" cy="44" r="2.5" fill="var(--cg-clicked)" />}
    </svg>
  );
}
