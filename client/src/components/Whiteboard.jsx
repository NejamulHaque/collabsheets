import { useCallback, useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { Pen, Eraser, Trash2, Undo2, Download } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const COLORS = ['#111827', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'];

export default function Whiteboard({ ydoc, readOnly }) {
  const { user } = useAuthStore();
  const strokes = ydoc.getArray('wb-strokes');
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const drawing = useRef(null);
  const lastPt = useRef(null);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#111827');
  const [size, setSize] = useState(4);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const dpr = window.devicePixelRatio || 1;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    strokes.forEach((s) => {
      const pts = s.get('points');
      if (!pts || pts.length < 2) return;
      ctx.strokeStyle = s.get('color') || '#111827';
      ctx.lineWidth = (s.get('size') || 4) * dpr;
      ctx.beginPath();
      ctx.moveTo(pts.get(0) * w, pts.get(1) * h);
      if (pts.length === 2) ctx.lineTo(pts.get(0) * w + 0.01, pts.get(1) * h + 0.01);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts.get(i) * w, pts.get(i + 1) * h);
      ctx.stroke();
    });
  }, [strokes]);

  // Live-sync: redraw on any local or remote stroke change
  useEffect(() => {
    const obs = () => redraw();
    strokes.observeDeep(obs);
    return () => strokes.unobserveDeep(obs);
  }, [strokes, redraw]);

  // Responsive canvas
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current, wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, wrap.clientWidth * dpr);
      canvas.height = Math.max(1, wrap.clientHeight * dpr);
      redraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return [(e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height];
  };

  const onDown = (e) => {
    if (readOnly) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = getPos(e);
    lastPt.current = [x, y];
    ydoc.transact(() => {
      const s = new Y.Map();
      s.set('color', tool === 'eraser' ? '#ffffff' : color);
      s.set('size', tool === 'eraser' ? size * 4 : size);
      s.set('user', user?.username || 'Guest');
      const pts = new Y.Array();
      pts.push([x, y]);
      s.set('points', pts);
      strokes.push([s]);
      drawing.current = s;
    });
  };

  const onMove = (e) => {
    if (!drawing.current) return;
    const [x, y] = getPos(e);
    const [lx, ly] = lastPt.current || [x, y];
    if (Math.hypot(x - lx, y - ly) < 0.002) return;
    lastPt.current = [x, y];
    ydoc.transact(() => { if (drawing.current) drawing.current.get('points').push([x, y]); });
  };

  const onUp = () => { drawing.current = null; lastPt.current = null; };

  const undo = () => {
    const me = user?.username || 'Guest';
    for (let i = strokes.length - 1; i >= 0; i--) {
      if (strokes.get(i).get('user') === me) { ydoc.transact(() => strokes.delete(i, 1)); break; }
    }
  };

  const clearAll = () => {
    if (!strokes.length) return;
    if (window.confirm('Clear the whiteboard for everyone?')) {
      ydoc.transact(() => strokes.delete(0, strokes.length));
    }
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = canvasRef.current.toDataURL('image/png');
    a.download = 'whiteboard.png';
    a.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10 }}>
      <div className="glass" style={{ padding: '8px 10px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className={`btn btn-icon ${tool === 'pen' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTool('pen')} title="Pen"><Pen size={15} /></button>
        <button className={`btn btn-icon ${tool === 'eraser' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTool('eraser')} title="Eraser"><Eraser size={15} /></button>
        <span style={{ width: 1, height: 22, background: 'var(--border)' }} />
        {COLORS.map(c => (
          <button key={c} onClick={() => { setColor(c); setTool('pen'); }}
            style={{ width: 22, height: 22, borderRadius: 7, background: c, border: color === c && tool === 'pen' ? '2px solid var(--primary)' : '2px solid var(--border)', cursor: 'pointer' }} />
        ))}
        <span style={{ width: 1, height: 22, background: 'var(--border)' }} />
        <input type="range" min="2" max="20" value={size} onChange={e => setSize(+e.target.value)} style={{ width: 110 }} />
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{size}px</span>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-icon" onClick={undo} title="Undo my last stroke"><Undo2 size={15} /></button>
        <button className="btn btn-ghost btn-icon" onClick={download} title="Download PNG"><Download size={15} /></button>
        <button className="btn btn-danger btn-icon" onClick={clearAll} title="Clear board"><Trash2 size={15} /></button>
        {readOnly && <span style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 700 }}>👁 View only</span>}
      </div>
      <div ref={wrapRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#fff', borderRadius: 12, border: '1px solid var(--border)' }}>
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none', cursor: readOnly ? 'default' : 'crosshair' }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        />
      </div>
    </div>
  );
}