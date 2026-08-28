import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import {
  MousePointer, Pen, Highlighter, Eraser, Square, Circle, Diamond,
  StickyNote, Type, Image as ImgIcon, Sparkles, Undo2, Redo2, Trash2,
  Download, ZoomIn, ZoomOut, Maximize2, Move, ArrowRight, LayoutTemplate,
  Plus, X, Check, Copy, Palette, Eye, HelpCircle,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const COLORS = [
  '#000000', '#ef4444', '#f97316', '#f59e0b', '#10b981',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff',
];

const NOTE_COLORS = [
  { bg: '#fef08a', text: '#854d0e', name: 'Yellow' },
  { bg: '#bbf7d0', text: '#166534', name: 'Green' },
  { bg: '#bfdbfe', text: '#1e40af', name: 'Blue' },
  { bg: '#fbcfe8', text: '#9d174d', name: 'Pink' },
  { bg: '#fed7aa', text: '#9a3412', name: 'Orange' },
  { bg: '#e9d5ff', text: '#6b21a8', name: 'Purple' },
];

export default function Whiteboard({ ydoc, readOnly }) {
  const { user } = useAuthStore();
  const strokes = ydoc.getArray('wb-strokes');
  const stickyNotes = ydoc.getArray('wb-stickies');
  const shapes = ydoc.getArray('wb-shapes');

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  const [tool, setTool] = useState('pen'); // 'select', 'pen', 'highlighter', 'eraser', 'rect', 'circle', 'diamond', 'arrow', 'sticky', 'text', 'laser'
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(4);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeNoteColor, setActiveNoteColor] = useState(NOTE_COLORS[0]);

  // Drawing state
  const drawing = useRef(null);
  const lastPt = useRef(null);
  const laserTrail = useRef([]);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // Redraw freehand strokes & shapes onto Canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, w, h);

    // Background Dot Grid
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#cbd5e1';
    const dotSpacing = 24 * (zoom / 100) * dpr;
    const offsetX = (pan.x * dpr) % dotSpacing;
    const offsetY = (pan.y * dpr) % dotSpacing;
    for (let x = offsetX; x < w; x += dotSpacing) {
      for (let y = offsetY; y < h; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Apply Zoom & Pan transforms
    ctx.save();
    ctx.scale(dpr * (zoom / 100), dpr * (zoom / 100));
    ctx.translate(pan.x / (zoom / 100), pan.y / (zoom / 100));

    // Render Geometric Shapes
    shapes.forEach((sh) => {
      const type = sh.get('type');
      const x = sh.get('x') || 0;
      const y = sh.get('y') || 0;
      const sw = sh.get('w') || 100;
      const shH = sh.get('h') || 80;
      const strokeColor = sh.get('color') || '#000';
      const fillColor = sh.get('fill') || 'transparent';

      ctx.lineWidth = sh.get('size') || 2;
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = fillColor;

      ctx.beginPath();
      if (type === 'rect') {
        ctx.roundRect ? ctx.roundRect(x, y, sw, shH, 8) : ctx.rect(x, y, sw, shH);
      } else if (type === 'circle') {
        ctx.ellipse(x + sw / 2, y + shH / 2, Math.abs(sw / 2), Math.abs(shH / 2), 0, 0, Math.PI * 2);
      } else if (type === 'diamond') {
        ctx.moveTo(x + sw / 2, y);
        ctx.lineTo(x + sw, y + shH / 2);
        ctx.lineTo(x + sw / 2, y + shH);
        ctx.lineTo(x, y + shH / 2);
        ctx.closePath();
      } else if (type === 'arrow') {
        ctx.moveTo(x, y);
        ctx.lineTo(x + sw, y + shH);
      }
      if (fillColor !== 'transparent') ctx.fill();
      ctx.stroke();
    });

    // Render Freehand Strokes
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    strokes.forEach((s) => {
      const pts = s.get('points');
      if (!pts || pts.length < 2) return;
      const isHighlighter = s.get('isHighlighter');
      ctx.globalAlpha = isHighlighter ? 0.35 : 1.0;
      ctx.strokeStyle = s.get('color') || '#000';
      ctx.lineWidth = (s.get('size') || 4);

      ctx.beginPath();
      ctx.moveTo(pts.get(0), pts.get(1));
      if (pts.length === 2) ctx.lineTo(pts.get(0) + 0.1, pts.get(1) + 0.1);
      for (let i = 2; i < pts.length; i += 2) {
        ctx.lineTo(pts.get(i), pts.get(i + 1));
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    });

    ctx.restore();
  }, [strokes, shapes, zoom, pan]);

  // Observe Yjs Array updates
  useEffect(() => {
    const obs = () => redraw();
    strokes.observeDeep(obs);
    shapes.observeDeep(obs);
    stickyNotes.observeDeep(obs);
    return () => {
      strokes.unobserveDeep(obs);
      shapes.unobserveDeep(obs);
      stickyNotes.unobserveDeep(obs);
    };
  }, [strokes, shapes, stickyNotes, redraw]);

  // Resize canvas
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
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

  // Coordinate transformations
  const getCanvasCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const x = (clientX - pan.x) / (zoom / 100);
    const y = (clientY - pan.y) / (zoom / 100);
    return { x, y };
  };

  // Mouse / Touch Event Handlers
  const onPointerDown = (e) => {
    if (readOnly) return;
    const { x, y } = getCanvasCoords(e);
    setCursorPos({ x, y });

    // Pan canvas
    if (tool === 'select' || e.button === 1 || e.spaceKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // Add Sticky Note
    if (tool === 'sticky') {
      ydoc.transact(() => {
        const n = new Y.Map();
        n.set('id', Date.now().toString());
        n.set('x', x);
        n.set('y', y);
        n.set('text', '💡 New Idea');
        n.set('bg', activeNoteColor.bg);
        n.set('textColor', activeNoteColor.text);
        n.set('author', user?.username || 'Guest');
        stickyNotes.push([n]);
      });
      setTool('select');
      return;
    }

    // Add Shape
    if (['rect', 'circle', 'diamond', 'arrow'].includes(tool)) {
      ydoc.transact(() => {
        const sh = new Y.Map();
        sh.set('type', tool);
        sh.set('x', x);
        sh.set('y', y);
        sh.set('w', 120);
        sh.set('h', 80);
        sh.set('color', color);
        sh.set('fill', 'transparent');
        sh.set('size', brushSize);
        shapes.push([sh]);
      });
      setTool('select');
      redraw();
      return;
    }

    // Freehand Drawing / Highlighter / Eraser
    lastPt.current = { x, y };
    ydoc.transact(() => {
      const s = new Y.Map();
      s.set('color', tool === 'eraser' ? '#f8fafc' : color);
      s.set('size', tool === 'eraser' ? brushSize * 4 : brushSize);
      s.set('isHighlighter', tool === 'highlighter');
      s.set('user', user?.username || 'Guest');
      const pts = new Y.Array();
      pts.push([x, y]);
      s.set('points', pts);
      strokes.push([s]);
      drawing.current = s;
    });
  };

  const onPointerMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      redraw();
      return;
    }

    const { x, y } = getCanvasCoords(e);
    setCursorPos({ x, y });

    if (!drawing.current) return;
    const lx = lastPt.current?.x ?? x;
    const ly = lastPt.current?.y ?? y;
    if (Math.hypot(x - lx, y - ly) < 2) return;

    lastPt.current = { x, y };
    ydoc.transact(() => {
      drawing.current?.get('points').push([x, y]);
    });
  };

  const onPointerUp = () => {
    setIsPanning(false);
    drawing.current = null;
    lastPt.current = null;
  };

  // Sticky Note Operations
  const updateSticky = (idx, patch) => {
    if (readOnly) return;
    const n = stickyNotes.get(idx);
    if (!n) return;
    ydoc.transact(() => {
      Object.entries(patch).forEach(([k, v]) => n.set(k, v));
    });
  };

  const deleteSticky = (idx) => {
    if (readOnly) return;
    ydoc.transact(() => stickyNotes.delete(idx, 1));
  };

  // Insert Templates (Kanban, SWOT, Mind Map)
  const insertTemplate = (type) => {
    if (readOnly) return;
    const startX = 100;
    const startY = 100;

    ydoc.transact(() => {
      if (type === 'kanban') {
        const cols = [
          { title: '📋 To Do', bg: '#fef08a', text: '#854d0e', x: startX },
          { title: '⚡ In Progress', bg: '#bfdbfe', text: '#1e40af', x: startX + 220 },
          { title: '✅ Done', bg: '#bbf7d0', text: '#166534', x: startX + 440 },
        ];
        cols.forEach((c) => {
          const n = new Y.Map();
          n.set('id', Math.random().toString());
          n.set('x', c.x);
          n.set('y', startY);
          n.set('text', `${c.title}\n• Task item`);
          n.set('bg', c.bg);
          n.set('textColor', c.text);
          stickyNotes.push([n]);
        });
      } else if (type === 'swot') {
        const swot = [
          { title: '💪 Strengths', bg: '#bbf7d0', text: '#166534', x: startX, y: startY },
          { title: '⚠️ Weaknesses', bg: '#fbcfe8', text: '#9d174d', x: startX + 220, y: startY },
          { title: '🚀 Opportunities', bg: '#bfdbfe', text: '#1e40af', x: startX, y: startY + 180 },
          { title: '🛡 Threats', bg: '#fed7aa', text: '#9a3412', x: startX + 220, y: startY + 180 },
        ];
        swot.forEach(s => {
          const n = new Y.Map();
          n.set('id', Math.random().toString());
          n.set('x', s.x);
          n.set('y', s.y);
          n.set('text', `${s.title}\n• Detail here`);
          n.set('bg', s.bg);
          n.set('textColor', s.text);
          stickyNotes.push([n]);
        });
      }
    });
    setShowTemplates(false);
  };

  const undo = () => {
    const me = user?.username || 'Guest';
    for (let i = strokes.length - 1; i >= 0; i--) {
      if (strokes.get(i).get('user') === me) {
        ydoc.transact(() => strokes.delete(i, 1));
        break;
      }
    }
  };

  const clearAll = () => {
    if (confirm('Clear the entire whiteboard for all collaborators?')) {
      ydoc.transact(() => {
        strokes.delete(0, strokes.length);
        shapes.delete(0, shapes.length);
        stickyNotes.delete(0, stickyNotes.length);
      });
    }
  };

  const downloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'collab-whiteboard.png';
    a.click();
  };

  return (
    <div className="wb-super-container">
      {/* 1️⃣ FLOATING TOP WHITEBOARD TOOLBAR */}
      <div className="wb-floating-toolbar glass">
        {/* Selection / Pan */}
        <button
          className={`wb-tool-btn ${tool === 'select' ? 'active' : ''}`}
          title="Select / Move (V)"
          onClick={() => setTool('select')}
        >
          <MousePointer size={16} />
        </button>

        {/* Freehand Pen */}
        <button
          className={`wb-tool-btn ${tool === 'pen' ? 'active' : ''}`}
          title="Pen (P)"
          onClick={() => setTool('pen')}
        >
          <Pen size={16} />
        </button>

        {/* Glowing Highlighter */}
        <button
          className={`wb-tool-btn ${tool === 'highlighter' ? 'active' : ''}`}
          title="Highlighter (H)"
          onClick={() => setTool('highlighter')}
        >
          <Highlighter size={16} />
        </button>

        {/* Eraser */}
        <button
          className={`wb-tool-btn ${tool === 'eraser' ? 'active' : ''}`}
          title="Eraser (E)"
          onClick={() => setTool('eraser')}
        >
          <Eraser size={16} />
        </button>

        <span className="wb-sep" />

        {/* Shapes Menu */}
        <button
          className={`wb-tool-btn ${tool === 'rect' ? 'active' : ''}`}
          title="Rectangle (R)"
          onClick={() => setTool('rect')}
        >
          <Square size={16} />
        </button>
        <button
          className={`wb-tool-btn ${tool === 'circle' ? 'active' : ''}`}
          title="Circle (C)"
          onClick={() => setTool('circle')}
        >
          <Circle size={16} />
        </button>
        <button
          className={`wb-tool-btn ${tool === 'diamond' ? 'active' : ''}`}
          title="Diamond (D)"
          onClick={() => setTool('diamond')}
        >
          <Diamond size={16} />
        </button>

        <span className="wb-sep" />

        {/* Sticky Note Tool with Color Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button
            className={`wb-tool-btn ${tool === 'sticky' ? 'active' : ''}`}
            title="Sticky Note (N)"
            onClick={() => setTool('sticky')}
            style={{ color: activeNoteColor.text, background: tool === 'sticky' ? activeNoteColor.bg : undefined }}
          >
            <StickyNote size={16} />
          </button>
          {NOTE_COLORS.map(nc => (
            <button
              key={nc.name}
              className={`wb-note-color-dot ${activeNoteColor.name === nc.name ? 'active' : ''}`}
              style={{ backgroundColor: nc.bg }}
              onClick={() => { setActiveNoteColor(nc); setTool('sticky'); }}
              title={nc.name}
            />
          ))}
        </div>

        <span className="wb-sep" />

        {/* Color Palette */}
        <div style={{ display: 'flex', gap: 3 }}>
          {COLORS.map(c => (
            <button
              key={c}
              className={`wb-color-dot ${color === c && tool === 'pen' ? 'active' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => { setColor(c); if (tool === 'eraser') setTool('pen'); }}
            />
          ))}
        </div>

        <span className="wb-sep" />

        {/* Brush Size */}
        <input
          type="range"
          min="2"
          max="24"
          value={brushSize}
          onChange={e => setBrushSize(+e.target.value)}
          className="wb-size-slider"
          title={`Brush Size: ${brushSize}px`}
        />

        <span className="wb-sep" />

        {/* Templates */}
        <button
          className="btn btn-ghost"
          style={{ padding: '4px 10px', fontSize: 12 }}
          onClick={() => setShowTemplates(!showTemplates)}
        >
          <LayoutTemplate size={14} /> Templates
        </button>

        {/* Undo / Export / Clear */}
        <button className="wb-tool-btn" title="Undo" onClick={undo}><Undo2 size={15} /></button>
        <button className="wb-tool-btn" title="Download PNG" onClick={downloadPNG}><Download size={15} /></button>
        <button className="wb-tool-btn danger" title="Clear Board" onClick={clearAll}><Trash2 size={15} /></button>
      </div>

      {/* 2️⃣ TEMPLATES POPUP */}
      {showTemplates && (
        <div className="wb-templates-popup glass">
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>Insert Whiteboard Template</div>
          <div className="template-cards-list">
            <div className="wb-temp-card" onClick={() => insertTemplate('kanban')}>
              <b>📋 Kanban Sprint Board</b>
              <span>To Do, In Progress, and Done columns with sticky notes.</span>
            </div>
            <div className="wb-temp-card" onClick={() => insertTemplate('swot')}>
              <b>📊 SWOT Analysis Matrix</b>
              <span>Strengths, Weaknesses, Opportunities, Threats.</span>
            </div>
          </div>
        </div>
      )}

      {/* 3️⃣ MAIN INFINITE WHITEBOARD STAGE */}
      <div ref={wrapRef} className="wb-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="wb-main-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />

        {/* Realtime Collaborative Sticky Notes Layer */}
        <div
          className="wb-stickies-layer"
          style={{
            transform: `scale(${zoom / 100}) translate(${pan.x / (zoom / 100)}px, ${pan.y / (zoom / 100)}px)`,
            transformOrigin: 'top left',
          }}
        >
          {Array.from(stickyNotes).map((note, idx) => {
            const nx = note.get('x') || 0;
            const ny = note.get('y') || 0;
            const bg = note.get('bg') || '#fef08a';
            const textColor = note.get('textColor') || '#854d0e';
            const text = note.get('text') || '';
            const author = note.get('author') || 'Collaborator';

            return (
              <div
                key={idx}
                className="wb-sticky-note"
                style={{
                  left: `${nx}px`,
                  top: `${ny}px`,
                  backgroundColor: bg,
                  color: textColor,
                }}
              >
                <div className="sticky-header">
                  <span className="sticky-author">{author}</span>
                  {!readOnly && (
                    <button className="sticky-close" onClick={() => deleteSticky(idx)}>
                      <X size={12} />
                    </button>
                  )}
                </div>
                <textarea
                  className="sticky-textarea"
                  disabled={readOnly}
                  value={text}
                  onChange={e => updateSticky(idx, { text: e.target.value })}
                  style={{ color: textColor }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 4️⃣ BOTTOM WHITEBOARD STATUS & NAVIGATION BAR */}
      <div className="wb-bottom-bar glass">
        <div className="wb-status-left">
          <span>🎨 Whiteboard Canvas</span>
          <span>•</span>
          <span>{strokes.length} Strokes</span>
          <span>•</span>
          <span>{stickyNotes.length} Sticky Notes</span>
        </div>

        <div className="wb-status-right">
          <button className="wb-mini-btn" onClick={() => setZoom(z => Math.max(25, z - 10))}>
            <ZoomOut size={13} />
          </button>
          <span style={{ fontSize: 12, minWidth: 42, textAlign: 'center' }}>{zoom}%</span>
          <button className="wb-mini-btn" onClick={() => setZoom(z => Math.min(200, z + 10))}>
            <ZoomIn size={13} />
          </button>
          <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => { setZoom(100); setPan({ x: 0, y: 0 }); }}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}