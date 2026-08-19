import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import {
  Plus, Copy, Trash2, ArrowUp, ArrowDown, Play, X, ChevronLeft, ChevronRight,
  Image as ImgIcon, Eraser, LayoutGrid, CalendarDays, Video,
} from 'lucide-react';

export const THEMES = [
  { name: 'Aurora', bg: 'linear-gradient(135deg,#7c5cff,#22d3ee)', color: '#fff' },
  { name: 'Midnight', bg: 'linear-gradient(135deg,#0f172a,#334155)', color: '#f8fafc' },
  { name: 'Sunset', bg: 'linear-gradient(135deg,#f97316,#ec4899)', color: '#fff' },
  { name: 'Forest', bg: 'linear-gradient(135deg,#059669,#84cc16)', color: '#fff' },
  { name: 'Ocean', bg: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff' },
  { name: 'Candy', bg: 'linear-gradient(135deg,#f472b6,#a78bfa)', color: '#fff' },
  { name: 'Carbon', bg: 'linear-gradient(135deg,#111827,#374151)', color: '#f9fafc' },
  { name: 'Paper', bg: '#ffffff', color: '#111827' },
];

export const bgStyle = (s) => {
  const t = THEMES[s.get('theme') ?? 0];
  const img = s.get('image');
  return img
    ? { background: `linear-gradient(rgba(8,10,20,.55), rgba(8,10,20,.55)), url(${img}) center/cover`, color: '#fff' }
    : { background: t.bg, color: t.color };
};

const makeSlide = (title = 'New Slide', body = '• Add your points here', theme = 0) => {
  const m = new Y.Map();
  m.set('title', title); m.set('body', body); m.set('theme', theme);
  m.set('notes', ''); m.set('transition', 'fade'); m.set('tspeed', '0.5s'); m.set('animation', 'fade');
  return m;
};

export default function SlidesEditor({ ydoc, docId, readOnly }) {
  const slides = ydoc.getArray('slides');
  const [, bump] = useState(0);
  const [current, setCurrent] = useState(0);
  const [tab, setTab] = useState('Home');
  const [presenting, setPresenting] = useState(false);
  const [pIdx, setPIdx] = useState(0);
  const [overview, setOverview] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [presenter, setPresenter] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const bcRef = useRef(null);

  useEffect(() => {
    const obs = () => bump(x => x + 1);
    slides.observe(obs);
    if (slides.length === 0 && !readOnly) {
      ydoc.transact(() => slides.push([makeSlide('My Presentation', '• Click Present to start\n• Add slides from the Home tab', 0)]));
    }
    return () => slides.unobserve(obs);
  }, [slides, ydoc, readOnly]);

  useEffect(() => {
    if (!presenting) return;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setPIdx(i => Math.min(i + 1, slides.length - 1));
      if (e.key === 'ArrowLeft') setPIdx(i => Math.max(i - 1, 0));
      if (e.key === 'Escape') { setPresenting(false); setPresenter(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presenting, slides.length]);

  useEffect(() => {
    if (!presenter) return;
    bcRef.current = new BroadcastChannel('cs-present-' + docId);
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => { bcRef.current?.close(); clearInterval(t); };
  }, [presenter, docId]);

  useEffect(() => {
    if (presenter && bcRef.current) bcRef.current.postMessage({ type: 'idx', idx: pIdx });
  }, [pIdx, presenter]);

  const idx = Math.min(current, Math.max(0, slides.length - 1));
  const slide = slides.length ? slides.get(idx) : null;
  if (!slide) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading slides...</div>;

  const addSlide = () => { if (readOnly) return; ydoc.transact(() => slides.insert(idx + 1, [makeSlide()])); setCurrent(idx + 1); };
  const dupSlide = () => { if (readOnly) return; ydoc.transact(() => slides.insert(idx + 1, [makeSlide(slide.get('title'), slide.get('body'), slide.get('theme') ?? 0)])); setCurrent(idx + 1); };
  const delSlide = () => { if (readOnly) return; if (slides.length > 1) { ydoc.transact(() => slides.delete(idx, 1)); setCurrent(Math.max(0, idx - 1)); } };
  const move = (d) => { if (readOnly) return; const to = idx + d; if (to < 0 || to >= slides.length) return; ydoc.transact(() => slides.move(idx, to)); setCurrent(to); };
  const applyTransitionAll = () => { if (readOnly) return; ydoc.transact(() => Array.from(slides).forEach(s => { s.set('transition', slide.get('transition')); s.set('tspeed', slide.get('tspeed')); })); };

  const startPresenter = () => {
    window.open(`/present/${docId}`, 'audience', 'width=1100,height=700');
    setPIdx(idx); setSeconds(0); setPresenter(true); setPresenting(true);
  };
  
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const nextSlide = slides.get(Math.min(pIdx + 1, slides.length - 1));

  // Helper for read-only inputs
  const handleSlideChange = (key, value) => {
    if (!readOnly) slide.set(key, value);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      <div className="glass ribbon">
        <div className="ribbon-tabs">
          {['Home', 'Insert', 'Design', 'Transitions', 'Animations', 'Slide Show', 'View'].map(t => (
            <button key={t} className={`ribbon-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ color: 'var(--muted)', fontSize: 12, paddingBottom: 6 }}>
            {slides.length} slides {readOnly && '• 👁 View Only'}
          </span>
        </div>
        <div className="ribbon-body">
          {tab === 'Home' && (<>
            <button className="btn btn-ghost" disabled={readOnly} style={{ padding: '6px 10px', fontSize: 13 }} onClick={addSlide}><Plus size={14} /> New Slide</button>
            <button className="btn btn-ghost" disabled={readOnly} style={{ padding: '6px 10px', fontSize: 13 }} onClick={dupSlide}><Copy size={14} /> Duplicate</button>
            <button className="btn btn-danger" disabled={readOnly} style={{ padding: '6px 10px', fontSize: 13 }} onClick={delSlide}><Trash2 size={14} /> Delete</button>
            <button className="btn btn-ghost" disabled={readOnly} style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => move(-1)}><ArrowUp size={14} /> Up</button>
            <button className="btn btn-ghost" disabled={readOnly} style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => move(1)}><ArrowDown size={14} /> Down</button>
          </>)}

          {tab === 'Insert' && (<>
            <button className="btn btn-ghost" disabled={readOnly} style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => { const u = prompt('Background image URL'); if (u) handleSlideChange('image', u); }}><ImgIcon size={14} /> Background Image</button>
            <button className="btn btn-ghost" disabled={readOnly} style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => handleSlideChange('image', null)}><Eraser size={14} /> Remove Image</button>
            <button className="btn btn-ghost" disabled={readOnly} style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => handleSlideChange('body', (slide.get('body') || '') + '\n• ' + new Date().toLocaleDateString())}><CalendarDays size={14} /> Insert Date</button>
          </>)}

          {tab === 'Design' && (<>
            {THEMES.map((t, i) => (
              <button key={i} title={t.name} disabled={readOnly} onClick={() => handleSlideChange('theme', i)}
                style={{ width: 26, height: 26, borderRadius: 8, background: t.bg, border: i === (slide.get('theme') ?? 0) ? '2px solid var(--primary)' : '2px solid var(--border)', cursor: readOnly ? 'not-allowed' : 'pointer', opacity: readOnly ? 0.6 : 1 }} />
            ))}
          </>)}

          {tab === 'Transitions' && (<>
            <select className="tb-select" disabled={readOnly} value={slide.get('transition') || 'fade'} onChange={e => handleSlideChange('transition', e.target.value)}>
              <option value="fade">Fade</option>
              <option value="slide">Slide</option>
              <option value="zoom">Zoom</option>
              <option value="morph">Morph ✨</option>
              <option value="none">None</option>
            </select>
            <select className="tb-select" disabled={readOnly} value={slide.get('tspeed') || '0.5s'} onChange={e => handleSlideChange('tspeed', e.target.value)}>
              <option value="0.3s">Fast (0.3s)</option>
              <option value="0.5s">Normal (0.5s)</option>
              <option value="0.8s">Slow (0.8s)</option>
            </select>
            <button className="btn btn-ghost" disabled={readOnly} style={{ padding: '6px 10px', fontSize: 13 }} onClick={applyTransitionAll}>Apply to All</button>
          </>)}

          {tab === 'Animations' && (<>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>CONTENT ANIMATION</span>
            <select className="tb-select" disabled={readOnly} value={slide.get('animation') || 'fade'} onChange={e => handleSlideChange('animation', e.target.value)}>
              <option value="none">None</option>
              <option value="fade">Fade</option>
              <option value="slide">Slide Up</option>
              <option value="zoom">Zoom</option>
            </select>
          </>)}

          {tab === 'Slide Show' && (<>
            <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => { setPIdx(0); setPresenting(true); }}><Play size={14} /> From Start</button>
            <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => { setPIdx(idx); setPresenting(true); }}><Play size={14} /> From Current</button>
            <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={startPresenter}><Video size={14} /> Presenter View</button>
          </>)}

          {tab === 'View' && (<>
            <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => setOverview(!overview)}><LayoutGrid size={14} /> Grid Overview</button>
            <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => setShowNotes(!showNotes)}>📝 {showNotes ? 'Hide' : 'Show'} Notes</button>
          </>)}
        </div>
      </div>

      {overview ? (
        <div className="overview-grid">
          {Array.from(slides).map((s, i) => (
            <div key={i} className={`overview-slide ${i === idx ? 'active' : ''}`} style={bgStyle(s)} onClick={() => { setCurrent(i); setOverview(false); }}>
              <div style={{ fontSize: 11, opacity: .7 }}>{i + 1}</div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{s.get('title')}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="slides-wrap" style={{ flex: 1 }}>
          <div className="slides-side">
            {Array.from(slides).map((s, i) => (
              <div key={i} className={`slide-thumb ${i === idx ? 'active' : ''}`} style={bgStyle(s)} onClick={() => setCurrent(i)}>
                <div style={{ fontSize: 10, opacity: .7 }}>{i + 1}</div>
                <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.get('title')}</div>
              </div>
            ))}
          </div>

          <div className="slide-canvas" style={bgStyle(slide)}>
            <input 
              className="slide-title" 
              readOnly={readOnly} 
              value={slide.get('title') || ''} 
              onChange={e => handleSlideChange('title', e.target.value)} 
              placeholder="Slide title" 
            />
            <textarea 
              className="slide-body" 
              readOnly={readOnly} 
              value={slide.get('body') || ''} 
              onChange={e => handleSlideChange('body', e.target.value)} 
              placeholder="Write bullet points…" 
            />
            {showNotes && (
              <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginBottom: 6 }}>SPEAKER NOTES (Private)</div>
                <textarea 
                  className="slide-notes" 
                  readOnly={readOnly} 
                  value={slide.get('notes') || ''} 
                  onChange={e => handleSlideChange('notes', e.target.value)} 
                  placeholder="Notes only you can see while presenting..." 
                />
              </div>
            )}
          </div>
        </div>
      )}

      {presenting && slides.get(pIdx) && (
        <div className="present-overlay" style={{ background: '#000' }}>
          <button className="btn btn-ghost btn-icon" style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }} onClick={() => { setPresenting(false); setPresenter(false); }}><X size={20} /></button>
          <button style={{ position: 'absolute', left: presenter ? 320 : 20, bottom: 20, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setPIdx(i => Math.max(0, i - 1))}><ChevronLeft size={40} /></button>

          <div key={pIdx} className={`present-slide ${slides.get(pIdx).get('transition') || 'fade'}`}
            style={{ ...bgStyle(slides.get(pIdx)), animationDuration: slides.get(pIdx).get('tspeed') || '0.5s', marginRight: presenter ? 300 : 0 }}>
            <div className={`present-title anim-${slides.get(pIdx).get('animation') || 'fade'}`}>{slides.get(pIdx).get('title')}</div>
            <div className={`present-body anim-${slides.get(pIdx).get('animation') || 'fade'}`} style={{ animationDelay: '0.15s' }}>{slides.get(pIdx).get('body')}</div>
          </div>

          <button style={{ position: 'absolute', right: presenter ? 320 : 20, bottom: 20, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setPIdx(i => Math.min(slides.length - 1, i + 1))}><ChevronRight size={40} /></button>

          {presenter && (
            <div className="presenter-panel">
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'monospace' }}>⏱ {fmt(seconds)}</div>
              <div style={{ fontSize: 12, opacity: .7 }}>SLIDE {pIdx + 1} / {slides.length}</div>
              <div style={{ fontSize: 12, opacity: .7, marginTop: 8 }}>NEXT</div>
              {nextSlide ? (
                <div className="presenter-next" style={bgStyle(nextSlide)}><b>{nextSlide.get('title')}</b></div>
              ) : <div style={{ fontSize: 12, opacity: .5 }}>End of deck</div>}
              <div style={{ fontSize: 12, opacity: .7, marginTop: 8 }}>NOTES</div>
              <textarea 
                className="slide-notes" 
                readOnly={readOnly}
                value={slides.get(pIdx)?.get('notes') || ''} 
                onChange={e => handleSlideChange('notes', e.target.value)} 
              />
            </div>
          )}

          <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', color: '#94a3b8', fontSize: 13 }}>
            {pIdx + 1} / {slides.length} — ← → navigate, Esc exit
          </div>
        </div>
      )}
    </div>
  );
}