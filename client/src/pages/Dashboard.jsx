import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, useAuthStore } from '../store/authStore';
import { QRCodeSVG } from 'qrcode.react';
import {
  FileText, Plus, Crown, LogOut, Search, Pin, Trash2, MoreHorizontal,
  LayoutGrid, Star, Clock, X, Pencil, User, ShieldCheck, Menu,
  Code2, FileSpreadsheet, Presentation, Palette, CheckCircle2,
  Copy, Download, ExternalLink, Sparkles, Filter, List, ArrowUpRight,
} from 'lucide-react';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import InstallPWA from '../components/InstallPWA';
import CommandPalette from '../components/CommandPalette';
import NotificationsBell from '../components/NotificationsBell';
import { useThemeStore } from '../store/themeStore';

const CREATION_CARDS = [
  {
    mode: 'code',
    title: 'VS Code Project',
    desc: 'Python, JavaScript, Git & Terminal',
    icon: <Code2 size={24} />,
    color: '#007acc',
    bg: 'linear-gradient(135deg, rgba(0,122,204,0.15), rgba(0,122,204,0.05))',
    border: '#007acc',
  },
  {
    mode: 'richtext',
    title: 'Word Document',
    desc: 'Typography, Ruler, TOC & Speech',
    icon: <FileText size={24} />,
    color: '#185abd',
    bg: 'linear-gradient(135deg, rgba(24,90,189,0.15), rgba(24,90,189,0.05))',
    border: '#185abd',
  },
  {
    mode: 'sheets',
    title: 'Excel Spreadsheet',
    desc: '30+ Formulas, Charts & Multi-Sheet',
    icon: <FileSpreadsheet size={24} />,
    color: '#107c41',
    bg: 'linear-gradient(135deg, rgba(16,124,65,0.15), rgba(16,124,65,0.05))',
    border: '#107c41',
  },
  {
    mode: 'slides',
    title: 'PowerPoint Deck',
    desc: 'Transitions, Themes & Laser View',
    icon: <Presentation size={24} />,
    color: '#c43e1c',
    bg: 'linear-gradient(135deg, rgba(196,62,28,0.15), rgba(196,62,28,0.05))',
    border: '#c43e1c',
  },
  {
    mode: 'whiteboard',
    title: 'Whiteboard Canvas',
    desc: 'Infinite Grid, Stickies & Shapes',
    icon: <Palette size={24} />,
    color: '#7c5cff',
    bg: 'linear-gradient(135deg, rgba(124,92,255,0.15), rgba(124,92,255,0.05))',
    border: '#7c5cff',
  },
];

export default function Dashboard() {
  const { user, hydrate, logout } = useAuthStore();
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'code', 'richtext', 'sheets', 'slides', 'whiteboard', 'pinned'
  const [viewLayout, setViewLayout] = useState('grid'); // 'grid' | 'table'
  const [menuFor, setMenuFor] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [error, setError] = useState('');
  const [utr, setUtr] = useState('');
  const [showPaidPopup, setShowPaidPopup] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [sideOpen, setSideOpen] = useState(false);
  const { theme, setTheme } = useThemeStore();
  const UPI_LINK = 'upi://pay?pa=nejamulhaque@upi&pn=Nejamul%20Haque&am=749.00&cu=INR&tn=CollabSheets%20Pro';

  useEffect(() => { if (user?.theme) useThemeStore.getState().init(user.theme); }, [user?.theme]);
  useEffect(() => { hydrate(); }, []);

  useEffect(() => {
    API.get('/documents')
      .then(r => setDocs(r.data))
      .catch(() => setError('Failed to load documents'))
      .finally(() => setLoadingDocs(false));
  }, []);

  const filtered = useMemo(() => {
    let list = docs;
    if (activeFilter === 'pinned') {
      list = list.filter(d => d.is_pinned);
    } else if (activeFilter !== 'all') {
      list = list.filter(d => d.mode === activeFilter);
    }
    if (query.trim()) {
      list = list.filter(d => d.title.toLowerCase().includes(query.toLowerCase()));
    }
    return list;
  }, [docs, activeFilter, query]);

  const createDocWithMode = async (mode = 'code', customTitle) => {
    try {
      setError('');
      const title = customTitle || (
        mode === 'code' ? 'Untitled Project' :
        mode === 'richtext' ? 'Untitled Document' :
        mode === 'sheets' ? 'Untitled Spreadsheet' :
        mode === 'slides' ? 'Untitled Presentation' : 'Untitled Whiteboard'
      );
      const { data } = await API.post('/documents', { title, mode });
      navigate(`/documents/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create document');
    }
  };

  const patchDoc = async (doc, patch) => {
    const { data } = await API.patch(`/documents/${doc.id}`, patch);
    setDocs(ds => ds.map(d => (d.id === doc.id ? data : d)));
  };

  const removeDoc = async (doc) => {
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    await API.delete(`/documents/${doc.id}`);
    setDocs(ds => ds.filter(d => d.id !== doc.id));
  };

  const duplicateDoc = async (doc) => {
    createDocWithMode(doc.mode, `${doc.title} (Copy)`);
  };

  const renameDoc = async (doc) => {
    const t = window.prompt('Rename document', doc.title);
    if (t && t !== doc.title) patchDoc(doc, { title: t });
  };

  const doLogout = () => { logout(); navigate('/login'); };

  const notifyPayment = async () => {
    try {
      await API.post('/billing/notify-payment', { utr });
      setShowUpgrade(false);
      setShowPaidPopup(true);
      setUtr('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to notify payment');
    }
  };

  const getModeInfo = (m) => {
    switch (m) {
      case 'code': return { label: 'VS Code', color: '#007acc', icon: <Code2 size={16} /> };
      case 'richtext': return { label: 'Word 365', color: '#185abd', icon: <FileText size={16} /> };
      case 'sheets': return { label: 'Excel 365', color: '#107c41', icon: <FileSpreadsheet size={16} /> };
      case 'slides': return { label: 'PowerPoint 365', color: '#c43e1c', icon: <Presentation size={16} /> };
      default: return { label: 'Whiteboard', color: '#7c5cff', icon: <Palette size={16} /> };
    }
  };

  const dashCommands = [
    { label: 'New VS Code Project', icon: <Code2 size={14} />, run: () => createDocWithMode('code') },
    { label: 'New Word Document', icon: <FileText size={14} />, run: () => createDocWithMode('richtext') },
    { label: 'New Excel Sheet', icon: <FileSpreadsheet size={14} />, run: () => createDocWithMode('sheets') },
    { label: 'New PowerPoint Deck', icon: <Presentation size={14} />, run: () => createDocWithMode('slides') },
    { label: 'New Whiteboard', icon: <Palette size={14} />, run: () => createDocWithMode('whiteboard') },
    { label: 'Go to Profile', icon: <User size={14} />, run: () => navigate('/profile') },
    { label: 'Log out', icon: <LogOut size={14} />, run: doLogout },
  ];

  return (
    <div className="app-shell">
      {sideOpen && <div className="side-backdrop" onClick={() => setSideOpen(false)} />}

      {/* 1️⃣ LEFT NAVIGATION SIDEBAR */}
      <aside className={`sidebar ${sideOpen ? 'open' : ''}`}>
        <div className="logo"><Logo /></div>
        <button className={`side-item ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>
          <LayoutGrid size={16} /> All Workspaces
        </button>
        <button className={`side-item ${activeFilter === 'pinned' ? 'active' : ''}`} onClick={() => setActiveFilter('pinned')}>
          <Star size={16} /> Starred & Pinned
        </button>
        <button className={`side-item ${activeFilter === 'code' ? 'active' : ''}`} onClick={() => setActiveFilter('code')}>
          <Code2 size={16} style={{ color: '#007acc' }} /> VS Code Projects
        </button>
        <button className={`side-item ${activeFilter === 'richtext' ? 'active' : ''}`} onClick={() => setActiveFilter('richtext')}>
          <FileText size={16} style={{ color: '#185abd' }} /> Word Documents
        </button>
        <button className={`side-item ${activeFilter === 'sheets' ? 'active' : ''}`} onClick={() => setActiveFilter('sheets')}>
          <FileSpreadsheet size={16} style={{ color: '#107c41' }} /> Excel Sheets
        </button>
        <button className={`side-item ${activeFilter === 'slides' ? 'active' : ''}`} onClick={() => setActiveFilter('slides')}>
          <Presentation size={16} style={{ color: '#c43e1c' }} /> PowerPoint Decks
        </button>
        <button className={`side-item ${activeFilter === 'whiteboard' ? 'active' : ''}`} onClick={() => setActiveFilter('whiteboard')}>
          <Palette size={16} style={{ color: '#7c5cff' }} /> Whiteboards
        </button>

        <div style={{ height: 1, background: 'var(--border)', margin: '8px 12px' }} />

        <button className="side-item" onClick={() => navigate('/profile')}><User size={16} /> Profile & Account</button>
        {user?.is_admin && <button className="side-item" onClick={() => navigate('/admin')}><ShieldCheck size={16} /> Admin Console</button>}
        <button className="side-item" onClick={() => setShowUpgrade(true)}><Crown size={16} style={{ color: 'var(--warning)' }} /> Upgrade to Pro</button>

        <div className="side-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 8px' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'grid', placeItems: 'center', fontWeight: 700, flexShrink: 0 }}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{user?.tier === 'pro' ? '👑 Pro plan' : 'Free plan'}</div>
            </div>
            <button className="btn btn-ghost btn-icon" title="Log out" onClick={doLogout}><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      {/* 2️⃣ MAIN DASHBOARD AREA */}
      <div className="main-area">
        <header className="topbar">
          <button className="btn btn-ghost btn-icon hamburger" onClick={() => setSideOpen(!sideOpen)}><Menu size={18} /></button>
          <div className="search-wrap">
            <Search size={16} />
            <input className="input" placeholder="Search files, code, docs, sheets, slides… (⌘K)" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => createDocWithMode('code')}><Plus size={16} /> Quick Create</button>
          <NotificationsBell />
          <ThemeToggle />
          <InstallPWA />
        </header>

        <main className="content">
          {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

          {/* Greeting Hero */}
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 6px' }}>
              Welcome back, {user?.username || 'Creator'} 👋
            </h2>
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>
              Choose a creation tool below or jump right back into your active workspaces.
            </div>
          </div>

          {/* Quick Create Launchpad Cards */}
          <div className="dash-launchpad-grid">
            {CREATION_CARDS.map(card => (
              <div
                key={card.mode}
                className="dash-launch-card glass"
                style={{ background: card.bg, borderColor: `${card.border}44` }}
                onClick={() => createDocWithMode(card.mode)}
              >
                <div className="launch-icon" style={{ color: card.color }}>{card.icon}</div>
                <div>
                  <div className="launch-title">{card.title}</div>
                  <div className="launch-desc">{card.desc}</div>
                </div>
                <ArrowUpRight size={16} className="launch-arrow" style={{ color: card.color }} />
              </div>
            ))}
          </div>

          {/* Filter Bar & View Layout Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All Files' },
                { id: 'code', label: '💻 VS Code' },
                { id: 'richtext', label: '📄 Word' },
                { id: 'sheets', label: '📊 Excel' },
                { id: 'slides', label: '📽 PowerPoint' },
                { id: 'whiteboard', label: '🎨 Whiteboard' },
                { id: 'pinned', label: '⭐ Starred' },
              ].map(f => (
                <button
                  key={f.id}
                  className={`btn ${activeFilter === f.id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '6px 12px', fontSize: 12.5, borderRadius: 8 }}
                  onClick={() => setActiveFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                className={`btn btn-icon ${viewLayout === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
                title="Grid View"
                onClick={() => setViewLayout('grid')}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                className={`btn btn-icon ${viewLayout === 'table' ? 'btn-primary' : 'btn-ghost'}`}
                title="Table View"
                onClick={() => setViewLayout('table')}
              >
                <List size={15} />
              </button>
            </div>
          </div>

          {/* Document Content View */}
          {loadingDocs ? (
            <div className="doc-grid">{[...Array(6)].map((_, i) => <div key={i} className="skeleton skeleton-card" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state glass" style={{ padding: 48, borderRadius: 16, textAlign: 'center' }}>
              <FileText size={48} style={{ color: 'var(--muted)', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                {query ? `No matching workspaces for "${query}"` : 'No documents created yet.'}
              </div>
              <p style={{ color: 'var(--muted)', fontSize: 14, margin: '8px 0 16px' }}>
                Get started by creating your first document, code project, spreadsheet or presentation above.
              </p>
              <button className="btn btn-primary" onClick={() => createDocWithMode('code')}>
                <Plus size={16} /> Create Workspace
              </button>
            </div>
          ) : viewLayout === 'grid' ? (
            <div className="doc-grid">
              {filtered.map(doc => {
                const info = getModeInfo(doc.mode);
                return (
                  <div
                    key={doc.id}
                    className="doc-card glass"
                    style={{ zIndex: menuFor === doc.id ? 60 : undefined }}
                    onClick={() => navigate(`/documents/${doc.id}`)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="badge" style={{ color: info.color, borderColor: `${info.color}55`, display: 'flex', gap: 5, alignItems: 'center' }}>
                        {info.icon}
                        <span>{info.label}</span>
                      </span>

                      <button
                        className="btn btn-ghost btn-icon doc-menu-btn"
                        onClick={e => {
                          e.stopPropagation();
                          setMenuFor(menuFor === doc.id ? null : doc.id);
                        }}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>

                    {menuFor === doc.id && (
                      <div className="menu" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setMenuFor(null); renameDoc(doc); }}><Pencil size={14} /> Rename</button>
                        <button onClick={() => { setMenuFor(null); duplicateDoc(doc); }}><Copy size={14} /> Duplicate</button>
                        <button onClick={() => { setMenuFor(null); patchDoc(doc, { is_pinned: !doc.is_pinned }); }}>
                          <Star size={14} /> {doc.is_pinned ? 'Unstar' : 'Star / Pin'}
                        </button>
                        <button className="danger" onClick={() => { setMenuFor(null); removeDoc(doc); }}><Trash2 size={14} /> Delete</button>
                      </div>
                    )}

                    <div style={{ marginTop: 12 }}>
                      <p className="title" style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>{doc.title}</p>
                      <div className="meta" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)' }}>
                        {doc.is_pinned && <Star size={13} style={{ color: 'var(--warning)', fill: 'var(--warning)' }} />}
                        <span>Edited {new Date(doc.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="glass" style={{ overflow: 'hidden', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13.5 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--glass)' }}>
                    <th style={{ padding: '12px 16px' }}>Name</th>
                    <th style={{ padding: '12px 16px' }}>Type</th>
                    <th style={{ padding: '12px 16px' }}>Last Modified</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(doc => {
                    const info = getModeInfo(doc.mode);
                    return (
                      <tr
                        key={doc.id}
                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                        onClick={() => navigate(`/documents/${doc.id}`)}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {doc.is_pinned && <Star size={13} style={{ color: 'var(--warning)', fill: 'var(--warning)' }} />}
                          <span>{doc.title}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className="badge" style={{ color: info.color }}>{info.label}</span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>
                          {new Date(doc.updated_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            className="btn btn-ghost btn-icon"
                            onClick={e => { e.stopPropagation(); removeDoc(doc); }}
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      <CommandPalette commands={dashCommands} />

      {/* Upgrade to Pro Modal */}
      {showUpgrade && (
        <div className="modal-backdrop" onClick={() => setShowUpgrade(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h2 style={{ margin: 0 }}>Upgrade to Pro 👑</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowUpgrade(false)}><X size={18} /></button>
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ background: '#fff', padding: 12, borderRadius: 14 }}>
                <QRCodeSVG value={UPI_LINK} size={160} />
              </div>
              <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="badge badge-pro"><Crown size={12} /> PRO — ₹749/month</div>
                <div style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.6 }}>
                  1. Scan the QR with any UPI app (GPay / PhonePe / Paytm)<br />
                  2. Pay ₹749 to <b style={{ color: 'var(--text)' }}>nejamulhaque@upi</b><br />
                  3. Paste the UTR number below & notify us
                </div>
                <input className="input" placeholder="UTR / Transaction ID (optional)" value={utr} onChange={e => setUtr(e.target.value)} />
                <button className="btn btn-primary" onClick={notifyPayment}>✅ I have paid ₹749</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaidPopup && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{ fontSize: 40 }}>✅</div>
            <h3 style={{ margin: '10px 0' }}>Payment notified!</h3>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>
              The admin has been notified by email and will verify your payment shortly.
            </p>
            <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => { setShowPaidPopup(false); navigate('/profile'); }}>
              Open Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}