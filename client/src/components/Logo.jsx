export default function Logo({ size = 34, withText = true, textSize = 18 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none"
        style={{ borderRadius: size * 0.27, boxShadow: '0 4px 14px rgba(124,92,255,.35)', flexShrink: 0 }}>
        <defs>
          <linearGradient id="csGrad" x1="0" y1="0" x2="64" y2="64">
            <stop stopColor="#7c5cff" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="17" fill="url(#csGrad)" />
        {/* sheet lines */}
        <path d="M18 23h28M18 32h28M18 41h14" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.92" />
        {/* live cursor spark */}
        <path d="M38 33l14 5.4-5.8 2.6-2.6 5.8L38 33z" fill="#fff" />
      </svg>
      {withText && (
        <span style={{ fontWeight: 800, fontSize: textSize, letterSpacing: '-0.02em', color: 'var(--text)', whiteSpace: 'nowrap' }}>
          Collab<span style={{ color: 'var(--accent)' }}>Sheets</span>
        </span>
      )}
    </span>
  );
}