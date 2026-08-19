export default function Minimap({ code, onJump }) {
  const lines = code.split('\n');
  return (
    <div className="minimap" title="Minimap" onClick={(e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientY - rect.top) / rect.height;
      onJump(Math.max(1, Math.round(ratio * lines.length)));
    }}>
      {lines.slice(0, 220).map((l, i) => (
        <div key={i} className="minimap-line" style={{ width: `${Math.min(100, l.trim().length * 2.4)}%`, opacity: l.trim() ? 0.75 : 0 }} />
      ))}
    </div>
  );
}