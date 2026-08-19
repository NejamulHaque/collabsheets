import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Code2, FileText, Presentation, Sheet, Sparkles, Users, Video,
  Bot, Globe, Mail, ExternalLink, ShieldCheck, Lock, Database, KeyRound,
  Building2, Rocket, Cpu, GraduationCap, Boxes, ChevronLeft, ChevronRight,
  ArrowUp, MessageCircle, Download, X, Cookie,
} from 'lucide-react';
import Logo from '../components/Logo';
import IrusChat from '../components/IrusChat';

// ===== EDIT ME LATER =====
const IRUS_URL = 'https://irus-ai.onrender.com';
const STATS = [
  { end: 12400, suffix: '+', label: 'Docs created' },
  { end: 3200, suffix: '+', label: 'Teams onboard' },
  { end: 98, suffix: '%', label: 'Uptime SLA' },
  { end: 4.9, suffix: '★', decimals: 1, label: 'Average rating' },
];
const TEAMS = [
  { icon: <Building2 size={18} />, name: 'TechNova' },
  { icon: <Rocket size={18} />, name: 'CloudNine' },
  { icon: <Cpu size={18} />, name: 'FinEdge' },
  { icon: <GraduationCap size={18} />, name: 'EduPlus' },
  { icon: <Bot size={18} />, name: 'Irus AI' },
  { icon: <Boxes size={18} />, name: 'DevStudio' },
];
const TESTIMONIALS = [
  { name: 'Ayesha Rahman', role: 'Product Manager, TechNova', color: '#7c5cff', text: 'We replaced three tools with CollabSheets. The realtime code runner alone transformed our client demos — no more "it works on my machine".' },
  { name: 'Daniel Mendes', role: 'CTO, CloudNine', color: '#22d3ee', text: 'Live cursors, version history and a debugger in the browser. It feels like Google Docs and VS Code had a baby — and it\'s fast.' },
  { name: 'Priya Sharma', role: 'Data Lead, FinEdge', color: '#f59e0b', text: 'Pivot tables, formulas and charts that sync live across my whole team? At this price it\'s honestly unreal.' },
  { name: 'Marco Rossi', role: 'Professor, EduPlus', color: '#34d399', text: 'I grade student snippets live in the browser — 60+ languages with zero setup. My teaching assistants finally sleep at night.' },
];
const SECURITY = [
  { icon: <Lock size={20} />, t: 'End-to-end sync', d: 'Every keystroke travels over encrypted WebSockets with CRDT conflict-free merging — no lost edits, ever.' },
  { icon: <Database size={20} />, t: 'Neon cloud backups', d: 'Documents persist as Yjs snapshots in Neon Postgres with version history and one-click restore.' },
  { icon: <ShieldCheck size={20} />, t: 'GDPR-ready', d: 'Your data is exportable and deletable at any time. No ads, no trackers, no selling your content.' },
  { icon: <KeyRound size={20} />, t: 'Role-based access', d: 'Owner / Editor / Viewer roles, share links, team invites and admin payment approvals.' },
];
const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], desc: 'Command palette' },
  { keys: ['Ctrl', 'Enter'], desc: 'Run code' },
  { keys: ['Ctrl', 'F'], desc: 'Find & replace' },
  { keys: ['Tab'], desc: 'Accept AI autocomplete' },
  { keys: ['Alt', 'Click'], desc: 'Multi-cursor editing' },
  { keys: ['Esc'], desc: 'Exit presentation' },
];
const STRINGS = {
  en: {
    home: 'Home', services: 'Services', security: 'Security', other: 'Other Services', login: 'Login', signup: 'Sign Up',
    heroA: 'Work together,', heroB: 'in real time.',
    heroSub: 'CollabSheets is your all-in-one collaborative workspace — run 60+ languages, write Word-grade documents, present PowerPoint-grade slides and compute Excel-grade sheets, all live with your team.',
    cta1: '🚀 Get Started Free', cta2: 'Explore Services', trusted: 'Trusted by teams at',
    servicesTitle: ['Our', 'Services'], securityTitle: ['Enterprise-grade', 'Security'],
    shortcutsTitle: ['Power-user', 'Shortcuts'], testiTitle: ['Loved by', 'teams worldwide'],
    otherTitle: ['Other', 'Services & Projects'],
    cookie: 'We use cookies to improve your experience and analyze traffic. No personal data is ever sold.',
    accept: 'Accept', decline: 'Decline',
    pwa: 'Install CollabSheets as an app for quick access!', install: 'Install',
    chat: 'Ask Irus AI', backTop: 'Back to top',
  },
  hi: {
    home: 'होम', services: 'सेवाएँ', security: 'सुरक्षा', other: 'अन्य सेवाएँ', login: 'लॉग इन', signup: 'साइन अप',
    heroA: 'एक साथ काम करें,', heroB: 'रियल टाइम में।',
    heroSub: 'CollabSheets आपका ऑल-इन-वन कोलैबोरेटिव वर्कस्पेस है — 60+ भाषाएँ चलाएँ, Word-ग्रेड दस्तावेज़ लिखें, PowerPoint-ग्रेड स्लाइड्स प्रस्तुत करें और Excel-ग्रेड शीट्स की गणना करें — सब लाइव।',
    cta1: '🚀 मुफ़्त शुरू करें', cta2: 'सेवाएँ देखें', trusted: 'इन टीमों द्वारा विश्वसनीय',
    servicesTitle: ['हमारी', 'सेवाएँ'], securityTitle: ['एंटरप्राइज़-ग्रेड', 'सुरक्षा'],
    shortcutsTitle: ['पावर-यूज़र', 'शॉर्टकट'], testiTitle: ['दुनिया भर की टीमों को', 'पसंद'],
    otherTitle: ['अन्य', 'सेवाएँ और प्रोजेक्ट्स'],
    cookie: 'हम आपके अनुभव को बेहतर बनाने के लिए कुकीज़ का उपयोग करते हैं। कोई व्यक्तिगत डेटा नहीं बेचा जाता।',
    accept: 'स्वीकारें', decline: 'अस्वीकारें',
    pwa: 'त्वरित पहुँच के लिए CollabSheets ऐप इंस्टॉल करें!', install: 'इंस्टॉल',
    chat: 'Irus AI से पूछें', backTop: 'ऊपर जाएँ',
  },
};

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
  const [ti, setTi] = useState(0);
  const [lang, setLang] = useState(localStorage.getItem('cs-lang') || 'en');
  const [cookie, setCookie] = useState(localStorage.getItem('cs-cookie'));
  const [showPwa, setShowPwa] = useState(false);
  const [deferred, setDeferred] = useState(null);
  const T = STRINGS[lang];

  useEffect(() => {
    const onScroll = () => { setScrolled(window.scrollY > 10); setShowTop(window.scrollY > 400); };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTi(i => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  // PWA install prompt
  useEffect(() => {
    const onBip = (e) => {
      e.preventDefault();
      setDeferred(e);
      if (window.matchMedia('(max-width: 700px)').matches && !localStorage.getItem('cs-pwa-dismissed')) setShowPwa(true);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="landing">
      {/* Frozen navbar */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <button className="nav-logo" onClick={() => go('home')}><Logo /></button>
        <div className="nav-links">
          <button onClick={() => go('home')}>{T.home}</button>
          <button onClick={() => go('services')}>{T.services}</button>
          <button onClick={() => go('security')}>{T.security}</button>
          <button onClick={() => go('other')}>{T.other}</button>
        </div>
        <select className="lang-select" value={lang} onChange={e => { setLang(e.target.value); localStorage.setItem('cs-lang', e.target.value); }} title="Language">
          <option value="en">🌐 EN</option>
          <option value="hi">🌐 हिं</option>
        </select>
        <div className="nav-cta">
          <button className="btn btn-ghost" onClick={() => navigate('/login')}>{T.login}</button>
          <button className="btn btn-primary" onClick={() => navigate('/register')}>{T.signup}</button>
        </div>
      </nav>

      {/* 🏠 HOME with animated blobs */}
      <header className="hero" id="home">
        <div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" />
        <Logo size={84} withText={false} />
        <h1>{T.heroA} <span className="grad">{T.heroB}</span></h1>
        <p>{T.heroSub}</p>
        <div className="hero-cta">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>{T.cta1}</button>
          <button className="btn btn-ghost btn-lg" onClick={() => go('services')}>{T.cta2}</button>
        </div>
      </header>

      {/* 📈 Live stats */}
      <div className="stats-band">
        {STATS.map((s, i) => (
          <div key={i} className="stat-big glass">
            <CountUp end={s.end} suffix={s.suffix} decimals={s.decimals || 0} />
            <div className="lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 🏢 Trusted by */}
      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12.5, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>{T.trusted}</div>
      <div className="logo-strip">
        {TEAMS.map((t, i) => <span key={i} className="logo-item">{t.icon}{t.name}</span>)}
      </div>

      {/* 🛠️ Services */}
      <section className="section" id="services">
        <h2 className="section-title">{T.servicesTitle[0]} <span className="grad">{T.servicesTitle[1]}</span></h2>
        <div className="feature-grid">
          <div className="feature-card glass"><Code2 style={{ color: 'var(--accent)' }} /><h3>Cloud Code Runner</h3><p>Write & execute 60+ languages with a VS Code-style editor, debugger, Git panel & AI autocomplete.</p></div>
          <div className="feature-card glass"><FileText style={{ color: 'var(--primary)' }} /><h3>Live Documents</h3><p>MS-Word-grade editing with ribbons, templates, mail merge, comments & live cursors.</p></div>
          <div className="feature-card glass"><Presentation style={{ color: 'var(--warning)' }} /><h3>Presentations</h3><p>PowerPoint-grade slides with themes, morph transitions, presenter view & audience screen.</p></div>
          <div className="feature-card glass"><Sheet style={{ color: 'var(--success)' }} /><h3>Smart Sheets</h3><p>Excel-grade grid with formulas, charts, pivot tables, CSV import/export & realtime sync.</p></div>
          <div className="feature-card glass"><Sparkles style={{ color: 'var(--primary)' }} /><h3>Irus AI Assistant</h3><p>AI that explains, fixes and generates code & content right inside your editor.</p></div>
          <div className="feature-card glass"><Users style={{ color: 'var(--accent)' }} /><h3>Team Collaboration</h3><p>Multiplayer editing, chat, comments, video calls & screen share — no installs needed.</p></div>
        </div>
      </section>

      {/* 🛡️ Security */}
      <section className="section" id="security">
        <h2 className="section-title">{T.securityTitle[0]} <span className="grad">{T.securityTitle[1]}</span></h2>
        <div className="feature-grid">
          {SECURITY.map((s, i) => (
            <div key={i} className="feature-card glass"><span style={{ color: 'var(--accent)' }}>{s.icon}</span><h3>{s.t}</h3><p>{s.d}</p></div>
          ))}
        </div>
      </section>

      {/* ⌨️ Keyboard shortcuts showcase */}
      <section className="section">
        <h2 className="section-title">{T.shortcutsTitle[0]} <span className="grad">{T.shortcutsTitle[1]}</span></h2>
        <div className="feature-grid">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="glass kbd-card">
              <span style={{ display: 'flex', gap: 4 }}>{s.keys.map(k => <kbd key={k}>{k}</kbd>)}</span>
              <span style={{ color: 'var(--muted)', fontSize: 13.5 }}>{s.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 💬 Testimonials */}
      <section className="section">
        <h2 className="section-title">{T.testiTitle[0]} <span className="grad">{T.testiTitle[1]}</span></h2>
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

      {/* 🌐 Other services */}
      <section className="section" id="other">
        <h2 className="section-title">{T.otherTitle[0]} <span className="grad">{T.otherTitle[1]}</span></h2>
        <div className="feature-grid">
          <a className="feature-card glass" style={{ textDecoration: 'none', color: 'inherit' }} href={IRUS_URL} target="_blank" rel="noreferrer">
            <Bot style={{ color: 'var(--primary)' }} /><h3>Irus AI <ExternalLink size={14} /></h3>
            <p>My AI chatbot project — a smart companion for answers, ideas and productivity.</p>
          </a>
          <a className="feature-card glass" style={{ textDecoration: 'none', color: 'inherit' }} href="https://github.com/" target="_blank" rel="noreferrer">
            <Globe style={{ color: 'var(--accent)' }} /><h3>More Projects <ExternalLink size={14} /></h3>
            <p>Explore my other open-source work and experiments.</p>
          </a>
          <a className="feature-card glass" style={{ textDecoration: 'none', color: 'inherit' }} href="mailto:nejamulhaque.works@gmail.com">
            <Mail style={{ color: 'var(--warning)' }} /><h3>Hire / Contact</h3>
            <p>Want a custom collaborative app like this? Let's build it together.</p>
          </a>
        </div>
      </section>

      <footer className="landing-footer">
        <Logo size={26} textSize={14} />
        <span style={{ display: 'flex', gap: 14, alignItems: 'center', color: 'var(--muted)', flexWrap: 'wrap' }}>
          <button className="foot-link" onClick={() => navigate('/privacy')}>Privacy</button> •
          <button className="foot-link" onClick={() => navigate('/terms')}>Terms</button> •
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><ShieldCheck size={14} /> © 2026 CollabSheets</span>
        </span>
      </footer>

      {/* ⬆️ Back to top */}
      {showTop && (
        <button className="back-top" title={T.backTop} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <ArrowUp size={18} />
        </button>
      )}

      {/* 💬 Live chat bubble → opens Irus AI chat panel */}
       <IrusChat />
    
      {/* 📥 PWA install banner (mobile) */}
      {showPwa && deferred && (
        <div className="pwa-banner">
          <Download size={18} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 13.5, flex: 1 }}>{T.pwa}</span>
          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => { deferred.prompt(); setShowPwa(false); }}>{T.install}</button>
          <button className="btn btn-ghost btn-icon" onClick={() => { localStorage.setItem('cs-pwa-dismissed', '1'); setShowPwa(false); }}><X size={14} /></button>
        </div>
      )}

      {/* 🍪 Cookie consent */}
      {cookie === null && (
        <div className="cookie-banner">
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Cookie size={18} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 13.5, color: 'var(--muted)' }}>{T.cookie}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1, padding: '8px 12px', fontSize: 13 }} onClick={() => { localStorage.setItem('cs-cookie', '1'); setCookie('1'); }}>{T.accept}</button>
            <button className="btn btn-ghost" style={{ flex: 1, padding: '8px 12px', fontSize: 13 }} onClick={() => { localStorage.setItem('cs-cookie', '0'); setCookie('0'); }}>{T.decline}</button>
          </div>
        </div>
      )}
    </div>
  );
}