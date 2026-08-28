import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Code2, FileText, Presentation, Sheet, Sparkles, Users, Video,
  Bot, Globe, Mail, ExternalLink, ShieldCheck, Lock, Database, KeyRound,
  Building2, Rocket, Cpu, GraduationCap, Boxes, ChevronLeft, ChevronRight,
  ArrowUp, Download, X, Cookie, ArrowRight, Play, CheckCircle2,
  Terminal, Palette, Zap, Layers, Cpu as ChipIcon,
} from 'lucide-react';
import Logo from '../components/Logo';
import IrusChat from '../components/IrusChat';

const IRUS_URL = 'https://irus-ai.onrender.com';
const STATS = [
  { end: 12400, suffix: '+', label: 'Docs & Sheets Created' },
  { end: 3200, suffix: '+', label: 'Active Developer Teams' },
  { end: 99.9, suffix: '%', decimals: 1, label: 'Uptime & Reliability' },
  { end: 4.9, suffix: '★', decimals: 1, label: 'Average User Rating' },
];

const TEAMS = [
  { icon: <Building2 size={18} />, name: 'TechNova' },
  { icon: <Rocket size={18} />, name: 'CloudNine' },
  { icon: <Cpu size={18} />, name: 'FinEdge' },
  { icon: <GraduationCap size={18} />, name: 'EduPlus' },
  { icon: <Bot size={18} />, name: 'Irus AI' },
  { icon: <Boxes size={18} />, name: 'DevStudio' },
];

const SUITES = [
  {
    id: 'code',
    label: 'Visual Studio Code',
    icon: <Code2 size={16} />,
    color: '#007acc',
    tag: 'IDE & Cloud Runner',
    title: 'Pro Developer IDE with Cloud Runtime',
    desc: 'Full VS Code experience in the browser: multi-file explorer, CodeMirror 6, interactive bash terminal, Python/JS debugging, Git snapshots, and real-time multiplayer pair programming.',
    badge: '60+ Languages Supported',
    previewType: 'code',
  },
  {
    id: 'word',
    label: 'Microsoft Word 365',
    icon: <FileText size={16} />,
    color: '#185abd',
    tag: 'Rich Documents',
    title: 'Word 365 Document Suite with Live Ribbons',
    desc: 'Authentic Microsoft Word ribbon tabs (File, Home, Insert, Draw, Layout, Review, View), workable Header & Footer editing, horizontal measurement ruler, outline navigation, and text-to-speech reader.',
    badge: 'Full Ribbon & Pagination',
    previewType: 'word',
  },
  {
    id: 'excel',
    label: 'Microsoft Excel 365',
    icon: <Sheet size={16} />,
    color: '#107c41',
    tag: 'Spreadsheets',
    title: 'Excel 365 Grid Engine & Dynamic Formulas',
    desc: 'High-performance spreadsheet with 30+ formulas (=SUM, =AVERAGE, =IF, =MIN, =MAX), multi-sheet tabs, square cell fill-handle, live range statistics (SUM, AVG, MIN, MAX), and floating charts.',
    badge: '30+ Formulas & Charts',
    previewType: 'excel',
  },
  {
    id: 'powerpoint',
    label: 'Microsoft PowerPoint',
    icon: <Presentation size={16} />,
    color: '#c43e1c',
    tag: 'Presentations',
    title: 'PowerPoint 365 with Dual-Screen Presenter HUD',
    desc: 'Widescreen 16:9 presentation studio with 10 designer themes, slide transitions (Morph ✨, Fade, Push, Zoom), slide sorter grid, fullscreen laser pointer, and secondary speaker cockpit.',
    badge: 'Morph & Laser Presenter',
    previewType: 'powerpoint',
  },
  {
    id: 'board',
    label: 'Collaborative Board',
    icon: <Palette size={16} />,
    color: '#8b5cf6',
    tag: 'FigJam / Miro Style',
    title: 'Infinite Whiteboard for Brainstorming & Architecture',
    desc: 'Collaborative dot-grid canvas with freehand pen, glowing highlighter, geometric shapes, 6 pastel sticky notes with live sync, zoom/pan navigation, and Kanban / SWOT templates.',
    badge: 'Infinite Canvas & Sticky Notes',
    previewType: 'board',
  },
];

const TESTIMONIALS = [
  { name: 'Ayesha Rahman', role: 'Product Manager, TechNova', color: '#7c5cff', text: 'We replaced three separate SaaS subscriptions with Collab-Sheets. The live code runner and collaborative Word documents alone transformed how our engineering and product teams work.' },
  { name: 'Daniel Mendes', role: 'CTO, CloudNine', color: '#22d3ee', text: 'Live cursors, version history snapshots, and a Python debugger inside the browser. It feels like Google Docs and VS Code had a baby — and it runs at lightning speed.' },
  { name: 'Priya Sharma', role: 'Data Lead, FinEdge', color: '#f59e0b', text: 'Live Excel formulas, pivot tables, and instant charts that synchronize across our whole remote team in real time. At this level of polish, it is unmatched.' },
  { name: 'Marco Rossi', role: 'CS Professor, EduPlus', color: '#34d399', text: 'I grade student code snippets live with 60+ programming languages and zero setup. My teaching assistants finally get sleep at night!' },
];

const SECURITY = [
  { icon: <Lock size={20} />, t: 'End-to-End CRDT Sync', d: 'Every single keystroke travels over encrypted WebSockets with Yjs CRDT conflict-free resolution — zero lost edits, ever.' },
  { icon: <Database size={20} />, t: 'Neon Cloud Backups', d: 'Documents persist as durable Yjs snapshots in Neon Postgres with automated time-travel version history and 1-click rollback.' },
  { icon: <ShieldCheck size={20} />, t: 'Enterprise Security & Privacy', d: 'Your data is 100% exportable (.docx, .csv, .json) and deletable anytime. Zero ads, zero trackers, and zero telemetry selling.' },
  { icon: <KeyRound size={20} />, t: 'Role-Based Access Control', d: 'Granular Owner, Editor, and Viewer permissions with secure share links and WebRTC video call encryption.' },
];

function CountUp({ end, suffix = '', decimals = 0, duration = 1600 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const t0 = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - t0) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(end * eased);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, duration]);
  const text = decimals ? val.toFixed(decimals) : Math.round(val).toLocaleString('en-US');
  return <span ref={ref} className="num">{text}{suffix}</span>;
}

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [activeSuiteIdx, setActiveSuiteIdx] = useState(0);
  const [ti, setTi] = useState(0);
  const [cookie, setCookie] = useState(localStorage.getItem('cs-cookie'));

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10);
      setShowTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTi(i => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const currentSuite = SUITES[activeSuiteIdx];

  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="landing">
      {/* 1️⃣ NAVBAR */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <button className="nav-logo" onClick={() => go('home')}><Logo /></button>
        <div className="nav-links">
          <button onClick={() => go('home')}>Home</button>
          <button onClick={() => go('suites')}>5-in-1 Suites</button>
          <button onClick={() => go('security')}>Security</button>
          <button onClick={() => go('other')}>Ecosystem</button>
        </div>
        <div className="nav-cta">
          <button className="btn btn-ghost" onClick={() => navigate('/login')}>Sign In</button>
          <button className="btn btn-primary" onClick={() => navigate('/register')}>Get Started Free</button>
        </div>
      </nav>

      {/* 2️⃣ HERO SECTION */}
      <header className="hero" id="home">
        <div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" />
        <div className="badge badge-pro" style={{ marginBottom: 16, padding: '6px 14px', fontSize: 13, background: 'rgba(124, 92, 255, 0.15)', borderColor: 'var(--primary)' }}>
          ✨ Next-Gen Collaborative Workspace 2026
        </div>
        <h1>
          Code, Write, Calculate & Present. <br />
          <span className="grad">Together in Real Time.</span>
        </h1>
        <p style={{ maxWidth: 740, fontSize: 18, lineHeight: 1.6, color: 'var(--muted)', margin: '0 auto 28px' }}>
          Collab-Sheets unites <b>Visual Studio Code</b>, <b>Microsoft Word</b>, <b>Excel</b>, <b>PowerPoint</b>, and an <b>Infinite Whiteboard</b> in one lightning-fast multiplayer suite with Irus AI & HD Video Calls.
        </p>

        <div className="hero-cta" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')} style={{ padding: '14px 28px', fontSize: 15 }}>
            🚀 Launch Workspace Free <ArrowRight size={18} />
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => go('suites')} style={{ padding: '14px 24px', fontSize: 15 }}>
            <Play size={16} /> Explore 5-in-1 Suite
          </button>
        </div>

        {/* Feature Pills */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
          <span className="badge">✓ Zero Setup / No Installs</span>
          <span className="badge">✓ 60+ Cloud Code Execution</span>
          <span className="badge">✓ Real-time CRDT Multiplayer</span>
          <span className="badge">✓ WebRTC HD Video Calls</span>
        </div>

        {/* 🌟 3D SUITE HERO GRAPHIC SHOWCASE */}
        <div style={{ maxWidth: 1040, margin: '40px auto 0', position: 'relative', padding: '0 16px' }}>
          <div style={{ position: 'absolute', inset: -15, background: 'radial-gradient(ellipse at center, rgba(124,92,255,0.3) 0%, rgba(34,211,238,0.15) 50%, transparent 75%)', filter: 'blur(35px)', zIndex: 0 }} />
          <img
            src="/hero_banner.jpg"
            alt="CollabSheets 5-in-1 Suite Showcase"
            style={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              borderRadius: 18,
              border: '1px solid rgba(255,255,255,0.16)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 30px rgba(124, 92, 255, 0.25)',
              display: 'block',
            }}
          />
        </div>
      </header>

      {/* 3️⃣ LIVE STATS BAND */}
      <div className="stats-band">
        {STATS.map((s, i) => (
          <div key={i} className="stat-big glass">
            <CountUp end={s.end} suffix={s.suffix} decimals={s.decimals || 0} />
            <div className="lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 4️⃣ TRUSTED BY STRIP */}
      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', marginTop: 40 }}>
        TRUSTED BY INNOVATIVE TEAMS WORLDWIDE
      </div>
      <div className="logo-strip">
        {TEAMS.map((t, i) => <span key={i} className="logo-item">{t.icon}{t.name}</span>)}
      </div>

      {/* 5️⃣ INTERACTIVE 5-IN-1 SUITE SHOWCASE */}
      <section className="section" id="suites" style={{ paddingTop: 40 }}>
        <h2 className="section-title">The Complete <span className="grad">5-in-1 Productivity Suite</span></h2>
        <p style={{ textAlign: 'center', color: 'var(--muted)', maxWidth: 640, margin: '0 auto 32px' }}>
          Switch effortlessly between developer tools and office suites in a single click without losing context.
        </p>

        {/* Suite Tabs */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
          {SUITES.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setActiveSuiteIdx(idx)}
              className={`btn ${activeSuiteIdx === idx ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 999,
                fontSize: 13.5,
                borderColor: activeSuiteIdx === idx ? s.color : undefined,
                background: activeSuiteIdx === idx ? s.color : undefined,
                color: '#fff',
              }}
            >
              {s.icon}
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Active Suite Showcase Card */}
        <div className="glass" style={{ padding: 32, borderRadius: 20, maxWidth: 1000, margin: '0 auto', border: `1px solid ${currentSuite.color}40`, boxShadow: `0 12px 40px ${currentSuite.color}15` }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32, alignItems: 'center' }}>
            {/* Info Side */}
            <div>
              <div className="badge" style={{ background: `${currentSuite.color}20`, color: currentSuite.color, borderColor: currentSuite.color, marginBottom: 12 }}>
                {currentSuite.tag} • {currentSuite.badge}
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 12px', color: 'var(--text)' }}>
                {currentSuite.title}
              </h3>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--muted)', marginBottom: 20 }}>
                {currentSuite.desc}
              </p>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/register')}
                style={{ background: currentSuite.color, borderColor: currentSuite.color, color: '#fff' }}
              >
                Try {currentSuite.label} Free <ArrowRight size={15} />
              </button>
            </div>

            {/* Simulated Live UI Preview */}
            <div style={{ background: '#0f172a', borderRadius: 12, padding: 18, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', fontFamily: 'monospace' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, borderBottom: '1px solid #1e293b', paddingBottom: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                <span style={{ marginLeft: 10, fontSize: 11, color: '#94a3b8' }}>Collab-Sheets • {currentSuite.label}</span>
              </div>

              {currentSuite.previewType === 'code' && (
                <div style={{ fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.6 }}>
                  <div><span style={{ color: '#569cd6' }}>import</span> sys, time</div>
                  <div><span style={{ color: '#569cd6' }}>def</span> <span style={{ color: '#dcdcaa' }}>calculate_metrics</span>(data):</div>
                  <div style={{ paddingLeft: 18 }}><span style={{ color: '#6a9955' }}># Live Realtime Execution</span></div>
                  <div style={{ paddingLeft: 18 }}><span style={{ color: '#c586c0' }}>return</span> &#123; <span style={{ color: '#ce9178' }}>"status"</span>: <span style={{ color: '#ce9178' }}>"optimized"</span>, <span style={{ color: '#ce9178' }}>"sync"</span>: <span style={{ color: '#4ec9b0' }}>True</span> &#125;</div>
                  <div style={{ marginTop: 8, padding: 8, background: '#1e293b', borderRadius: 6, color: '#38bdf8' }}>
                    $ python main.py <br />
                    <span style={{ color: '#10b981' }}>✓ Process exited with code 0 in 14ms</span>
                  </div>
                </div>
              )}

              {currentSuite.previewType === 'word' && (
                <div style={{ background: '#ffffff', color: '#1e293b', padding: 14, borderRadius: 6, fontSize: 12, fontFamily: 'sans-serif' }}>
                  <div style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: 4, marginBottom: 8, color: '#64748b', fontSize: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Project Proposal 2026</span>
                    <span>Page 1 of 1</span>
                  </div>
                  <h4 style={{ margin: '0 0 6px', color: '#185abd', fontSize: 15 }}>Executive Summary</h4>
                  <p style={{ margin: '0 0 6px', lineHeight: 1.4, color: '#334155' }}>
                    Collab-Sheets brings high-fidelity Microsoft Word editing with collaborative typing, dynamic navigation outlines, and clean printable output.
                  </p>
                  <div style={{ background: '#eff6ff', padding: 6, borderRadius: 4, color: '#1e40af', fontSize: 11 }}>
                    ✓ Workable Header & Footer • Speech Read Aloud • PDF Export
                  </div>
                </div>
              )}

              {currentSuite.previewType === 'excel' && (
                <div style={{ background: '#ffffff', color: '#1e293b', padding: 10, borderRadius: 6, fontSize: 11, fontFamily: 'sans-serif' }}>
                  <div style={{ background: '#107c41', color: '#fff', padding: '4px 8px', borderRadius: 4, marginBottom: 6, fontWeight: 700 }}>
                    fx =SUM(B2:B4) → 184,500
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ border: '1px solid #cbd5e1', padding: 3 }}>Quarter</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: 3 }}>Revenue ($)</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: 3 }}>Growth</th>
                    </tr>
                    <tr><td style={{ border: '1px solid #cbd5e1', padding: 3 }}>Q1</td><td style={{ border: '1px solid #cbd5e1', padding: 3 }}>$45,000</td><td style={{ border: '1px solid #cbd5e1', padding: 3 }}>+12%</td></tr>
                    <tr><td style={{ border: '1px solid #cbd5e1', padding: 3 }}>Q2</td><td style={{ border: '1px solid #cbd5e1', padding: 3 }}>$62,500</td><td style={{ border: '1px solid #cbd5e1', padding: 3 }}>+18%</td></tr>
                    <tr><td style={{ border: '1px solid #cbd5e1', padding: 3 }}>Q3</td><td style={{ border: '1px solid #cbd5e1', padding: 3 }}>$77,000</td><td style={{ border: '1px solid #cbd5e1', padding: 3 }}>+24%</td></tr>
                  </table>
                </div>
              )}

              {currentSuite.previewType === 'powerpoint' && (
                <div style={{ background: 'linear-gradient(135deg, #c43e1c, #f97316)', color: '#fff', padding: 16, borderRadius: 6, fontSize: 12, fontFamily: 'sans-serif' }}>
                  <div style={{ fontSize: 10, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>SLIDE 1 • MORPH TRANSITION</div>
                  <h3 style={{ margin: '8px 0', fontSize: 16, fontWeight: 800 }}>Vision & Architecture 2026</h3>
                  <div style={{ opacity: 0.9, lineHeight: 1.5 }}>
                    • High-definition presenter view HUD <br />
                    • Realtime laser pointer and synchronized slides
                  </div>
                </div>
              )}

              {currentSuite.previewType === 'board' && (
                <div style={{ background: '#f8fafc', color: '#1e293b', padding: 16, borderRadius: 6, fontSize: 11, fontFamily: 'sans-serif', minHeight: 120, position: 'relative' }}>
                  <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: 8, borderRadius: 6, width: 140, boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
                    <b>💡 Core Idea:</b>
                    <div>Infinite dot canvas for team sprint planning</div>
                  </div>
                  <div style={{ background: '#e0e7ff', border: '1px solid #c7d2fe', padding: 8, borderRadius: 6, width: 140, position: 'absolute', right: 16, top: 20, boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
                    <b>🚀 Release 2.4</b>
                    <div>Multiplayer live sync</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 6️⃣ SECURITY SECTION */}
      <section className="section" id="security">
        <h2 className="section-title">Enterprise-Grade <span className="grad">Security & Reliability</span></h2>
        <div className="feature-grid">
          {SECURITY.map((s, i) => (
            <div key={i} className="feature-card glass">
              <span style={{ color: 'var(--accent)' }}>{s.icon}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7️⃣ TESTIMONIALS */}
      <section className="section">
        <h2 className="section-title">Loved by <span className="grad">Teams Worldwide</span></h2>
        <div className="testi-wrap">
          <button className="btn btn-ghost btn-icon testi-arrow" style={{ left: -52 }} onClick={() => setTi(i => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}><ChevronLeft size={18} /></button>
          <div className="testi-viewport">
            <div className="testi-track" style={{ transform: `translateX(-${ti * 100}%)` }}>
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="testi-card glass">
                  <div className="testi-text">"{t.text}"</div>
                  <div className="testi-person">
                    <div className="testi-avatar" style={{ background: t.color }}>{t.name.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{t.name}</div>
                      <div style={{ color: 'var(--muted)', fontSize: 13 }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon testi-arrow" style={{ right: -52 }} onClick={() => setTi(i => (i + 1) % TESTIMONIALS.length)}><ChevronRight size={18} /></button>
          <div className="testi-dots">
            {TESTIMONIALS.map((_, i) => <button key={i} className={`testi-dot ${i === ti ? 'active' : ''}`} onClick={() => setTi(i)} />)}
          </div>
        </div>
      </section>

      {/* 8️⃣ ECOSYSTEM & PROJECTS */}
      <section className="section" id="other">
        <h2 className="section-title">Connected <span className="grad">Ecosystem & Architecture</span></h2>
        <p style={{ textAlign: 'center', color: 'var(--muted)', maxWidth: 680, margin: '0 auto 32px' }}>
          Explore the unified real-time architecture connecting all 5 productivity modules, cloud runtimes, and developer tools.
        </p>

        {/* 3D Ecosystem Graphic */}
        <div style={{ maxWidth: 960, margin: '0 auto 40px', position: 'relative' }}>
          <img
            src="/ecosystem.jpg"
            alt="CollabSheets 3D Connected Ecosystem Architecture"
            style={{
              width: '100%',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              display: 'block',
            }}
          />
        </div>

        <div className="feature-grid">
          <a className="feature-card glass" style={{ textDecoration: 'none', color: 'inherit' }} href={IRUS_URL} target="_blank" rel="noreferrer">
            <Bot style={{ color: 'var(--primary)' }} /><h3>Irus AI <ExternalLink size={14} /></h3>
            <p>Smart AI companion for answers, coding assistance, and intelligent reasoning.</p>
          </a>
          <a className="feature-card glass" style={{ textDecoration: 'none', color: 'inherit' }} href="https://nestfy-beta.vercel.app/" target="_blank" rel="noreferrer">
            <Bot style={{ color: 'var(--primary)' }} /><h3>Nestfy <ExternalLink size={14} /></h3>
            <p>Production-grade, advanced personal finance and wealth management platform.</p>
          </a>
          <a className="feature-card glass" style={{ textDecoration: 'none', color: 'inherit' }} href="https://digital-lens.vercel.app/" target="_blank" rel="noreferrer">
            <Bot style={{ color: 'var(--primary)' }} /><h3>DigitalLens <ExternalLink size={14} /></h3>
            <p>Next-generation AI news intelligence platform with real-time sentiment analysis.</p>
          </a>
          <a className="feature-card glass" style={{ textDecoration: 'none', color: 'inherit' }} href="https://builderr-ai.vercel.app/login" target="_blank" rel="noreferrer">
            <Bot style={{ color: 'var(--primary)' }} /><h3>Portfolio Builder <ExternalLink size={14} /></h3>
            <p>Create elegant, professional portfolio websites in minutes with AI generation.</p>
          </a>
          <a className="feature-card glass" style={{ textDecoration: 'none', color: 'inherit' }} href="https://proresume-six.vercel.app/" target="_blank" rel="noreferrer">
            <Bot style={{ color: 'var(--primary)' }} /><h3>Resume Builder <ExternalLink size={14} /></h3>
            <p>Build ATS-friendly, clean professional resumes in minutes — free forever.</p>
          </a>
          <a className="feature-card glass" style={{ textDecoration: 'none', color: 'inherit' }} href="https://github.com/NejamulHaque" target="_blank" rel="noreferrer">
            <Globe style={{ color: 'var(--accent)' }} /><h3>GitHub Projects <ExternalLink size={14} /></h3>
            <p>Explore open-source developer tools, libraries, and experimental architectures.</p>
          </a>
          <a className="feature-card glass" style={{ textDecoration: 'none', color: 'inherit' }} href="mailto:nejamulhaque.works@gmail.com">
            <Mail style={{ color: 'var(--warning)' }} /><h3>Hire / Contact</h3>
            <p>Want a custom full-stack collaborative platform? Let's build it together.</p>
          </a>
        </div>
      </section>

      {/* 9️⃣ FOOTER */}
      <footer className="landing-footer">
        <Logo size={26} textSize={14} />
        <span style={{ display: 'flex', gap: 14, alignItems: 'center', color: 'var(--muted)', flexWrap: 'wrap' }}>
          <button className="foot-link" onClick={() => navigate('/privacy')}>Privacy</button> •
          <button className="foot-link" onClick={() => navigate('/terms')}>Terms</button> •
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><ShieldCheck size={14} /> © 2026 CollabSheets</span>
        </span>
      </footer>

      {/* ⬆️ BACK TO TOP */}
      {showTop && (
        <button className="back-top" title="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <ArrowUp size={18} />
        </button>
      )}

      {/* 💬 IRUS AI LIVE CHAT COPILOT */}
      <IrusChat />

      {/* 🍪 COOKIE BANNER */}
      {cookie === null && (
        <div className="cookie-banner">
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Cookie size={18} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13.5, color: 'var(--muted)' }}>We use minimal cookies for secure authentication and workspace session management.</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1, padding: '8px 12px', fontSize: 13 }} onClick={() => { localStorage.setItem('cs-cookie', '1'); setCookie('1'); }}>Accept</button>
            <button className="btn btn-ghost" style={{ flex: 1, padding: '8px 12px', fontSize: 13 }} onClick={() => { localStorage.setItem('cs-cookie', '0'); setCookie('0'); }}>Decline</button>
          </div>
        </div>
      )}
    </div>
  );
}