import { useEffect, useRef, useState } from 'react';

export default function MenuBar({ menus }) {
  const [open, setOpen] = useState(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const barRef = useRef(null);

  const toggle = (e, name) => {
    if (open === name) { setOpen(null); return; }
    const r = e.currentTarget.getBoundingClientRect();
    setPos({
      top: r.bottom + 4,
      left: Math.max(8, Math.min(r.left, window.innerWidth - 235)),
    });
    setOpen(name);
  };

  useEffect(() => {
    const close = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) setOpen(null);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(null); };
    const onScroll = () => setOpen(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const active = menus.find(m => m.name === open);

  return (
    <div className="menubar" ref={barRef}>
      {menus.map(m => (
        <button
          key={m.name}
          className={`menu-top ${open === m.name ? 'active' : ''}`}
          onClick={(e) => toggle(e, m.name)}
        >
          {m.name}
        </button>
      ))}

      {active && (
        <div
          className="menu-drop"
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 400 }}
        >
          {active.items.map(([label, fn], i) => (
            <button
              key={i}
              onClick={() => { setOpen(null); setTimeout(fn, 0); }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}