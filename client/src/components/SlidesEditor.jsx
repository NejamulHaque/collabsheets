import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import {
  Plus, Copy, Trash2, ArrowUp, ArrowDown, Play, X, ChevronLeft, ChevronRight, ChevronDown,
  Image as ImgIcon, Eraser, LayoutGrid, CalendarDays, Video, Presentation,
  FileText, Layout,
} from 'lucide-react';

export const THEMES = [
  { name: 'Office Modern', bg: 'linear-gradient(135deg,#c43e1c,#f97316)', color: '#fff' },
  { name: 'Slate Executive', bg: 'linear-gradient(135deg,#0f172a,#334155)', color: '#f8fafc' },
  { name: 'Sunset Glow', bg: 'linear-gradient(135deg,#e11d48,#fb923c)', color: '#fff' },
  { name: 'Emerald Nature', bg: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff' },
  { name: 'Deep Ocean', bg: 'linear-gradient(135deg,#0284c7,#6366f1)', color: '#fff' },
  { name: 'Royal Amethyst', bg: 'linear-gradient(135deg,#7c3aed,#c026d3)', color: '#fff' },
  { name: 'Obsidian Gold', bg: 'linear-gradient(135deg,#18181b,#27272a)', color: '#fbbf24' },
  { name: 'Pastel Studio', bg: 'linear-gradient(135deg,#fdf4ff,#fce7f3)', color: '#1e293b' },
  { name: 'Cyberpunk Neon', bg: 'linear-gradient(135deg,#000000,#111827)', color: '#22d3ee' },
  { name: 'Paper Clean', bg: '#ffffff', color: '#111827' },
];

export const LAYOUTS = [
  { id: 'title', label: 'Title Slide' },
  { id: 'title-content', label: 'Title & Content' },
  { id: 'two-content', label: 'Two Content' },
  { id: 'comparison', label: 'Comparison' },
  { id: 'section', label: 'Section Header' },
  { id: 'blank', label: 'Blank Slide' },
];

export const getSlideBgStyle = (s) => {
  const tIdx = s.get('theme') ?? 0;
  const t = THEMES[tIdx] || THEMES[0];
  const img = s.get('image');
  return img
    ? { background: `linear-gradient(rgba(8,10,20,.6), rgba(8,10,20,.6)), url(${img}) center/cover`, color: '#fff' }
    : { background: t.bg, color: t.color };
};

const makeSlide = (title = 'New Slide', body = '• Point 1: Your key topic here\n• Point 2: Supporting details and data', theme = 0, layout = 'title-content') => {
  const m = new Y.Map();
  m.set('title', title);
  m.set('body', body);
  m.set('body2', '• Additional column point\n• Secondary comparison data');
  m.set('theme', theme);
  m.set('layout', layout);
  m.set('notes', '');
  m.set('transition', 'fade');
  m.set('tspeed', '0.5s');
  m.set('animation', 'fade');
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
  const [laserActive, setLaserActive] = useState(false);
  const [laserPos, setLaserPos] = useState({ x: 0, y: 0 });
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('16-9'); // '16-9' or '4-3'

  const bcRef = useRef(null);

  useEffect(() => {
    const obs = () => bump(x => x + 1);
    slides.observe(obs);
    if (slides.length === 0 && !readOnly) {
      ydoc.transact(() => {
        slides.push([
          makeSlide('Welcome to PowerPoint 365', '• Advanced Realtime Collaborative Presentation\n• Click "From Beginning" or press F5 to present\n• Choose rich themes & transitions above', 0, 'title'),
          makeSlide('Key Highlights & Strategy', '• Multi-device synchronized presentation\n• Dual-screen Presenter Cockpit with live timer\n• Laser pointer and interactive slide drawing', 4, 'title-content'),
          makeSlide('Feature Comparison', '• Collab-Sheets: Realtime sync & AI powered\n• Traditional tools: Local and siloed', 2, 'two-content'),
        ]);
      });
    }
    return () => slides.unobserve(obs);
  }, [slides, ydoc, readOnly]);

  // Fullscreen presentation keyboard navigation
  useEffect(() => {
    if (!presenting) return;
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        setPIdx(i => Math.min(i + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setPIdx(i => Math.max(i - 1, 0));
      } else if (e.key === 'Escape') {
        setPresenting(false);
        setPresenter(false);
      } else if (e.key.toLowerCase() === 'l') {
        setLaserActive(l => !l);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presenting, slides.length]);

  // Presenter View BroadcastChannel & Timer
  useEffect(() => {
    if (!presenter) return;
    bcRef.current = new BroadcastChannel('cs-present-' + docId);
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => {
      bcRef.current?.close();
      clearInterval(t);
    };
  }, [presenter, docId]);

  useEffect(() => {
    if (presenter && bcRef.current) {
      bcRef.current.postMessage({ type: 'idx', idx: pIdx });
    }
  }, [pIdx, presenter]);

  const idx = Math.min(current, Math.max(0, slides.length - 1));
  const slide = slides.length ? slides.get(idx) : null;
  if (!slide) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading presentation...</div>;

  // Slide CRUD Actions
  const addSlideWithLayout = (layoutId) => {
    if (readOnly) return;
    ydoc.transact(() => slides.insert(idx + 1, [makeSlide('New Slide', '• Add content here', slide.get('theme') ?? 0, layoutId)]));
    setCurrent(idx + 1);
    setShowLayoutPicker(false);
  };

  const dupSlide = () => {
    if (readOnly) return;
    ydoc.transact(() => slides.insert(idx + 1, [
      makeSlide(slide.get('title'), slide.get('body'), slide.get('theme') ?? 0, slide.get('layout') || 'title-content')
    ]));
    setCurrent(idx + 1);
  };

  const delSlide = () => {
    if (readOnly) return;
    if (slides.length > 1) {
      ydoc.transact(() => slides.delete(idx, 1));
      setCurrent(Math.max(0, idx - 1));
    }
  };

  const moveSlide = (d) => {
    if (readOnly) return;
    const to = idx + d;
    if (to < 0 || to >= slides.length) return;
    ydoc.transact(() => slides.move(idx, to));
    setCurrent(to);
  };

  const applyTransitionAll = () => {
    if (readOnly) return;
    ydoc.transact(() => {
      Array.from(slides).forEach(s => {
        s.set('transition', slide.get('transition'));
        s.set('tspeed', slide.get('tspeed'));
      });
    });
    alert('Transition applied to all slides.');
  };

  const startPresenter = () => {
    window.open(`/present/${docId}`, 'audience', 'width=1100,height=700');
    setPIdx(idx);
    setSeconds(0);
    setPresenter(true);
    setPresenting(true);
  };

  const handleSlideChange = (key, value) => {
    if (!readOnly) slide.set(key, value);
  };

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const nextSlide = slides.get(Math.min(pIdx + 1, slides.length - 1));

  return (
    <div className="ppt-suite-wrapper">
      {/* 1️⃣ POWERPOINT 365 RIBBON */}
      <div className="ppt-ribbon-container">
        <div className="ppt-ribbon-tabs">
          <div className="ppt-brand-badge">
            <Presentation size={18} />
            <span>PowerPoint</span>
          </div>
          {['File', 'Home', 'Insert', 'Draw', 'Design', 'Transitions', 'Animations', 'Slide Show', 'View'].map(t => (
            <button
              key={t}
              className={`ppt-ribbon-tab ${tab === t ? 'active' : ''} ${t === 'File' ? 'tab-file' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--muted)', paddingRight: 10 }}>
            {slides.length} slides • {readOnly ? '👁 View Only' : 'Live Collaboration'}
          </span>
        </div>

        <div className="ppt-ribbon-body">
          {/* HOME TAB */}
          {tab === 'Home' && (
            <div className="ribbon-group-row">
              {/* New Slide with Layout dropdown */}
              <div style={{ position: 'relative' }}>
                <button className="ppt-action-btn primary" disabled={readOnly} onClick={() => setShowLayoutPicker(!showLayoutPicker)}>
                  <Plus size={15} />
                  <span>New Slide</span>
                  <ChevronDown size={12} />
                </button>
                {showLayoutPicker && (
                  <div className="ppt-layout-picker-popup">
                    <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Slide Layouts</div>
                    {LAYOUTS.map(l => (
                      <div key={l.id} className="layout-option" onClick={() => addSlideWithLayout(l.id)}>
                        <Layout size={14} />
                        <span>{l.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button className="word-tb-btn" disabled={readOnly} title="Duplicate Slide" onClick={dupSlide}><Copy size={15} /></button>
              <button className="word-tb-btn" disabled={readOnly} title="Delete Slide" onClick={delSlide}><Trash2 size={15} /></button>
              <span className="word-tb-sep" />
              <button className="word-tb-btn" disabled={readOnly} title="Move Up" onClick={() => moveSlide(-1)}><ArrowUp size={15} /></button>
              <button className="word-tb-btn" disabled={readOnly} title="Move Down" onClick={() => moveSlide(1)}><ArrowDown size={15} /></button>
              <span className="word-tb-sep" />
              <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => { setPIdx(0); setPresenting(true); }}>
                <Play size={14} /> Present (F5)
              </button>
            </div>
          )}

          {/* INSERT TAB */}
          {tab === 'Insert' && (
            <div className="ribbon-group-row">
              <button className="word-btn-tool" disabled={readOnly} onClick={() => {
                const u = prompt('Image URL:');
                if (u) handleSlideChange('image', u);
              }}>
                <ImgIcon size={16} />
                <span>Background Image</span>
              </button>
              <button className="word-btn-tool" disabled={readOnly} onClick={() => handleSlideChange('image', null)}>
                <Eraser size={16} />
                <span>Remove Image</span>
              </button>
              <button className="word-btn-tool" disabled={readOnly} onClick={() => handleSlideChange('body', (slide.get('body') || '') + `\n• Date: ${new Date().toLocaleDateString()}`)}>
                <CalendarDays size={16} />
                <span>Insert Date</span>
              </button>
            </div>
          )}

          {/* DESIGN TAB */}
          {tab === 'Design' && (
            <div className="ribbon-group-row">
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>THEMES:</span>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 0' }}>
                {THEMES.map((t, i) => (
                  <button
                    key={i}
                    title={t.name}
                    disabled={readOnly}
                    onClick={() => handleSlideChange('theme', i)}
                    className={`ppt-theme-swatch ${i === (slide.get('theme') ?? 0) ? 'active' : ''}`}
                    style={{ background: t.bg }}
                  >
                    <span>{t.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
              <span className="word-tb-sep" />
              <button
                className={`btn ${aspectRatio === '16-9' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: 12 }}
                onClick={() => setAspectRatio('16-9')}
              >
                16:9 Widescreen
              </button>
              <button
                className={`btn ${aspectRatio === '4-3' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '4px 10px', fontSize: 12 }}
                onClick={() => setAspectRatio('4-3')}
              >
                4:3 Standard
              </button>
            </div>
          )}

          {/* TRANSITIONS TAB */}
          {tab === 'Transitions' && (
            <div className="ribbon-group-row">
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>EFFECT:</span>
              <select
                className="word-select"
                disabled={readOnly}
                value={slide.get('transition') || 'fade'}
                onChange={e => handleSlideChange('transition', e.target.value)}
              >
                <option value="fade">Fade</option>
                <option value="slide">Push / Slide</option>
                <option value="zoom">Zoom</option>
                <option value="morph">Morph ✨</option>
                <option value="wipe">Wipe</option>
                <option value="flip">Flip 3D</option>
                <option value="none">None</option>
              </select>

              <select
                className="word-select"
                disabled={readOnly}
                value={slide.get('tspeed') || '0.5s'}
                onChange={e => handleSlideChange('tspeed', e.target.value)}
              >
                <option value="0.3s">Fast (0.3s)</option>
                <option value="0.5s">Normal (0.5s)</option>
                <option value="1.0s">Slow (1.0s)</option>
              </select>

              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={applyTransitionAll}>
                Apply to All Slides
              </button>
            </div>
          )}

          {/* ANIMATIONS TAB */}
          {tab === 'Animations' && (
            <div className="ribbon-group-row">
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>ENTRY ANIMATION:</span>
              <select
                className="word-select"
                disabled={readOnly}
                value={slide.get('animation') || 'fade'}
                onChange={e => handleSlideChange('animation', e.target.value)}
              >
                <option value="none">None</option>
                <option value="fade">Fade In</option>
                <option value="slide">Slide Up</option>
                <option value="zoom">Zoom In</option>
                <option value="bounce">Bounce</option>
              </select>
            </div>
          )}

          {/* SLIDE SHOW TAB */}
          {tab === 'Slide Show' && (
            <div className="ribbon-group-row">
              <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => { setPIdx(0); setPresenting(true); }}>
                <Play size={14} /> From Beginning
              </button>
              <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => { setPIdx(idx); setPresenting(true); }}>
                <Play size={14} /> From Current Slide
              </button>
              <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={startPresenter}>
                <Video size={14} /> Dual-Screen Presenter View
              </button>
            </div>
          )}

          {/* VIEW TAB */}
          {tab === 'View' && (
            <div className="ribbon-group-row">
              <button className="word-btn-tool" onClick={() => setOverview(!overview)}>
                <LayoutGrid size={16} />
                <span>{overview ? 'Normal View' : 'Slide Sorter'}</span>
              </button>
              <button className="word-btn-tool" onClick={() => setShowNotes(!showNotes)}>
                <FileText size={16} />
                <span>{showNotes ? 'Hide Speaker Notes' : 'Show Speaker Notes'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2️⃣ POWERPOINT STAGE & FILMSTRIP */}
      {overview ? (
        <div className="ppt-sorter-grid">
          {Array.from(slides).map((s, i) => (
            <div
              key={i}
              className={`ppt-sorter-slide ${i === idx ? 'active' : ''}`}
              style={getSlideBgStyle(s)}
              onClick={() => { setCurrent(i); setOverview(false); }}
            >
              <span className="sorter-num">{i + 1}</span>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{s.get('title')}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ppt-workspace-body">
          {/* Left Slide Filmstrip */}
          <div className="ppt-filmstrip">
            {Array.from(slides).map((s, i) => (
              <div
                key={i}
                className={`ppt-thumb-card ${i === idx ? 'active' : ''}`}
                style={getSlideBgStyle(s)}
                onClick={() => setCurrent(i)}
              >
                <span className="thumb-index">{i + 1}</span>
                <div className="thumb-title">{s.get('title') || 'Untitled Slide'}</div>
              </div>
            ))}
            {!readOnly && (
              <button className="ppt-thumb-add" onClick={() => addSlideWithLayout('title-content')}>
                <Plus size={16} />
                <span>Add Slide</span>
              </button>
            )}
          </div>

          {/* Center 16:9 Presentation Stage */}
          <div className="ppt-stage-area">
            <div
              className={`ppt-slide-canvas aspect-${aspectRatio}`}
              style={getSlideBgStyle(slide)}
            >
              {/* Slide Title */}
              <input
                className="ppt-slide-title-input"
                readOnly={readOnly}
                value={slide.get('title') || ''}
                onChange={e => handleSlideChange('title', e.target.value)}
                placeholder="Click to add slide title"
              />

              {/* Two Content Layout */}
              {slide.get('layout') === 'two-content' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, flex: 1 }}>
                  <textarea
                    className="ppt-slide-body-input"
                    readOnly={readOnly}
                    value={slide.get('body') || ''}
                    onChange={e => handleSlideChange('body', e.target.value)}
                    placeholder="Left column bullet points..."
                  />
                  <textarea
                    className="ppt-slide-body-input"
                    readOnly={readOnly}
                    value={slide.get('body2') || ''}
                    onChange={e => handleSlideChange('body2', e.target.value)}
                    placeholder="Right column bullet points..."
                  />
                </div>
              ) : (
                <textarea
                  className="ppt-slide-body-input"
                  readOnly={readOnly}
                  value={slide.get('body') || ''}
                  onChange={e => handleSlideChange('body', e.target.value)}
                  placeholder="Click to add bullet points or subtitle content..."
                />
              )}
            </div>

            {/* Bottom Speaker Notes Drawer */}
            {showNotes && (
              <div className="ppt-speaker-notes-drawer">
                <div className="notes-header">
                  <span>📝 SPEAKER NOTES (Visible only to you during presentation)</span>
                </div>
                <textarea
                  className="notes-input"
                  readOnly={readOnly}
                  value={slide.get('notes') || ''}
                  onChange={e => handleSlideChange('notes', e.target.value)}
                  placeholder="Type speaker talking points here..."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3️⃣ FULLSCREEN AUDIENCE / PRESENTER OVERLAY */}
      {presenting && slides.get(pIdx) && (
        <div
          className="ppt-presentation-overlay"
          onMouseMove={e => setLaserPos({ x: e.clientX, y: e.clientY })}
        >
          {laserActive && (
            <div
              className="ppt-laser-pointer"
              style={{ left: `${laserPos.x}px`, top: `${laserPos.y}px` }}
            />
          )}

          {/* Top Presentation Bar */}
          <div className="ppt-present-topbar">
            <button className="vscode-icon-btn" onClick={() => { setPresenting(false); setPresenter(false); }}>
              <X size={20} color="#fff" />
            </button>
            <span style={{ color: '#fff', fontSize: 13 }}>
              Slide {pIdx + 1} of {slides.length}
            </span>
            <div style={{ flex: 1 }} />
            <button
              className={`btn ${laserActive ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '4px 10px', fontSize: 12 }}
              onClick={() => setLaserActive(!laserActive)}
            >
              🔴 Laser Pointer (L)
            </button>
          </div>

          {/* Navigation Arrows */}
          <button className="ppt-nav-arrow left" onClick={() => setPIdx(i => Math.max(0, i - 1))}>
            <ChevronLeft size={44} />
          </button>

          {/* Active Fullscreen Slide */}
          <div
            key={pIdx}
            className={`ppt-fullscreen-slide anim-${slides.get(pIdx).get('animation') || 'fade'} trans-${slides.get(pIdx).get('transition') || 'fade'}`}
            style={{
              ...getSlideBgStyle(slides.get(pIdx)),
              animationDuration: slides.get(pIdx).get('tspeed') || '0.5s',
              marginRight: presenter ? 320 : 0,
            }}
          >
            <div className="fullscreen-slide-title">{slides.get(pIdx).get('title')}</div>
            <div className="fullscreen-slide-body">{slides.get(pIdx).get('body')}</div>
          </div>

          <button className="ppt-nav-arrow right" onClick={() => setPIdx(i => Math.min(slides.length - 1, i + 1))}>
            <ChevronRight size={44} />
          </button>

          {/* Dual-Screen Presenter Cockpit */}
          {presenter && (
            <div className="ppt-presenter-cockpit">
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'monospace' }}>⏱ {fmtTime(seconds)}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>SLIDE {pIdx + 1} / {slides.length}</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>NEXT SLIDE:</div>
              {nextSlide ? (
                <div className="presenter-next-box" style={getSlideBgStyle(nextSlide)}>
                  <b>{nextSlide.get('title')}</b>
                </div>
              ) : <div style={{ fontSize: 12, opacity: 0.5 }}>End of slide deck</div>}
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>SPEAKER NOTES:</div>
              <div className="presenter-notes-box">
                {slides.get(pIdx)?.get('notes') || 'No speaker notes for this slide.'}
              </div>
            </div>
          )}

          <div className="ppt-present-hint">
            Press <b>←</b> / <b>→</b> or Space to navigate • <b>Esc</b> to exit presentation
          </div>
        </div>
      )}
    </div>
  );
}