import { X, Puzzle } from 'lucide-react';
import { EXTENSIONS } from '../extensions/registry';

export default function ExtensionsModal({ exts, onToggle, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}><Puzzle size={16} style={{ verticalAlign: -2 }} /> Extensions Marketplace</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        {EXTENSIONS.map(e => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{e.name}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>{e.desc}</div>
            </div>
            <button className={`btn ${exts[e.id] ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => onToggle(e.id)}>
              {exts[e.id] ? 'Installed' : 'Install'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}