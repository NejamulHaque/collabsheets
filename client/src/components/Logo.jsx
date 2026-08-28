export default function Logo({ size = 34, withText = true, textSize = 18 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <img
        src="/logo.jpg"
        alt="CollabSheets Logo"
        width={size}
        height={size}
        style={{
          borderRadius: size * 0.27,
          boxShadow: '0 4px 14px rgba(124,92,255,.35)',
          flexShrink: 0,
          objectFit: 'cover',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      />
      {withText && (
        <span style={{ fontWeight: 800, fontSize: textSize, letterSpacing: '-0.02em', color: 'var(--text)', whiteSpace: 'nowrap' }}>
          Collab<span style={{ color: 'var(--accent)' }}>Sheets</span>
        </span>
      )}
    </span>
  );
}