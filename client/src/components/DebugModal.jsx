import { X, Bug } from 'lucide-react';

export default function DebugModal({ debug, onClose }) {
  if (!debug) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}><Bug size={16} style={{ verticalAlign: -2 }} /> Debugger — {debug.stops.length} breakpoint hit(s)</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        {debug.stderr && <div className="run-stderr" style={{ marginBottom: 10 }}>{debug.stderr}</div>}
        {debug.stops.map((s, i) => (
          <div key={i} className="glass" style={{ padding: 12, marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>⛔ Stopped at line {s.line}</div>
            {Object.entries(s.vars).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 10, fontSize: 13, fontFamily: 'monospace', padding: '2px 0' }}>
                <span style={{ color: 'var(--accent)' }}>{k}</span>
                <span style={{ color: 'var(--muted)' }}>= {String(v)}</span>
              </div>
            ))}
          </div>
        ))}
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Program output:</div>
        <div className="run-stdout">{debug.stdout || '(none)'}</div>
      </div>
    </div>
  );
}