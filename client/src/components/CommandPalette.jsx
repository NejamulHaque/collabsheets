import { useEffect, useState, useRef } from 'react';
import { Search } from 'lucide-react';

export default function CommandPalette({ commands }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { if (open) { setQ(''); setTimeout(() => inputRef.current?.focus(), 50); } }, [open]);

  const filtered = commands.filter(c => c.label.toLowerCase().includes(q.toLowerCase()));
  if (!open) return null;

  return (
    <div className="modal-backdrop" style={{ alignItems: 'flex-start', paddingTop: '12vh' }} onClick={() => setOpen(false)}>
      <div className="modal palette" onClick={e => e.stopPropagation()}>
        <div className="palette-input">
          <Search size={16} />
          <input ref={inputRef} placeholder="Type a command… (Ctrl+K)" value={q} onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && filtered[0]) { filtered[0].run(); setOpen(false); } }} />
        </div>
        <div className="palette-list">
          {filtered.map(c => (
            <button key={c.label} onClick={() => { c.run(); setOpen(false); }}>{c.icon}{c.label}<span className="palette-hint">{c.hint || ''}</span></button>
          ))}
          {filtered.length === 0 && <div className="empty-state-small">No commands found</div>}
        </div>
      </div>
    </div>
  );
}