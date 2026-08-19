import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, useAuthStore } from '../store/authStore';
import { QRCodeSVG } from 'qrcode.react';
import {
  FileText, Plus, Crown, LogOut, Search, Pin, Trash2, MoreHorizontal,
  LayoutGrid, Star, Clock, X, Pencil, User, ShieldCheck, Menu,
} from 'lucide-react';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import InstallPWA from '../components/InstallPWA';
import CommandPalette from '../components/CommandPalette';
import NotificationsBell from '../components/NotificationsBell';
import { useThemeStore } from '../store/themeStore';

export default function Dashboard() {
  const { user, hydrate, logout } = useAuthStore();
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [query, setQuery] = useState('');
  const [view, setView] = useState('all');
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (sessionId) {
      API.post('/billing/sync-session', { sessionId }).then(() => hydrate()).catch(() => {});
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

  const filtered = useMemo(() => {
    let list = docs;
    if (view === 'pinned') list = list.filter(d => d.is_pinned);
    if (view === 'recent') list = [...list].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 6);
    if (query.trim()) list = list.filter(d => d.title.toLowerCase().includes(query.toLowerCase()));
    return list;
  }, [docs, view, query]);

  const createDoc = async () => {
    try {
      setError('');
      const { data } = await API.post('/documents', { title: 'Untitled CollabSheet', mode: 'code' });
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

  const dashCommands = [
    { label: 'New document', icon: <Plus size={14} />, run: createDoc },
    { label: 'Go to Profile', icon: <User size={14} />, run: () => navigate('/profile') },
    { label: 'Go to Admin', icon: <ShieldCheck size={14} />, run: () => navigate('/admin') },
    { label: 'Upgrade to Pro', icon: <Crown size={14} />, run: () => setShowUpgrade(true) },
    { label: 'Toggle theme', icon: <Menu size={14} />, run: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
    { label: 'Log out', icon: <LogOut size={14} />, run: doLogout },
  ];

  return (
    <div className="app-shell">
      {sideOpen && <div className="side-backdrop" onClick={() => setSideOpen(false)} />}

      <aside className={`sidebar ${sideOpen ? 'open' : ''}`}>
        <div className="logo"><Logo /></div>
        <button className={`side-item ${view === 'all' ? 'active' : ''}`} onClick={() => setView('all')}><LayoutGrid size={16} /> All documents</button>
        <button className={`side-item ${view === 'pinned' ? 'active' : ''}`} onClick={() => setView('pinned')}><Pin size={16} /> Pinned</button>
        <button className={`side-item ${view === 'recent' ? 'active' : ''}`} onClick={() => setView('recent')}><Clock size={16} /> Recent</button>
        <button className="side-item" onClick={() => navigate('/profile')}><User size={16} /> Profile</button>
        {user?.is_admin && <button className="side-item" onClick={() => navigate('/admin')}><ShieldCheck size={16} /> Admin</button>}
        <button className="side-item" onClick={() => setShowUpgrade(true)}><Crown size={16} /> Upgrade</button>

        <div className="side-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 8px' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'grid', placeItems: 'center', fontWeight: 700, flexShrink: 0 }}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{user?.tier === 'pro' ? 'Pro plan' : 'Free plan'}</div>
            </div>
            <button className="btn btn-ghost btn-icon" title="Log out" onClick={doLogout}><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="btn btn-ghost btn-icon hamburger" onClick={() => setSideOpen(!sideOpen)}><Menu size={18} /></button>
          <div className="search-wrap">
            <Search size={16} />
            <input className="input" placeholder="Search documents…" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={createDoc}><Plus size={16} /> New Sheet</button>
          <NotificationsBell />
          <ThemeToggle />
          <InstallPWA />
        </header>

        <main className="content">
          {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

          <div className="stats-grid">
            <div className="stat-card glass"><span className="label">Documents</span><span className="value">{docs.length}</span></div>
            <div className="stat-card glass"><span className="label">Pinned</span><span className="value">{docs.filter(d => d.is_pinned).length}</span></div>
            <div className="stat-card glass"><span className="label">Plan</span><span className="value" style={{ fontSize: 18 }}>{user?.tier === 'pro' ? '👑 Pro' : 'Free'}</span></div>
            <div className="stat-card glass"><span className="label">AI requests today</span><span className="value">{user?.tier === 'pro' ? '∞' : `${user?.ai_requests_today ?? 0}/5`}</span></div>
          </div>

          {loadingDocs ? (
            <div className="doc-grid">{[...Array(6)].map((_, i) => <div key={i} className="skeleton skeleton-card" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <FileText size={40} />
              <div>{query ? `No results for "${query}"` : 'No documents yet. Create your first CollabSheet!'}</div>
              <button className="btn btn-primary" onClick={createDoc}><Plus size={16} /> Create document</button>
            </div>
          ) : (
            <div className="doc-grid">
              {filtered.map(doc => (
                <div 
                  key={doc.id} 
                  className="doc-card glass" 
                  style={{ zIndex: menuFor === doc.id ? 60 : undefined }} 
                  onClick={() => navigate(`/documents/${doc.id}`)}
                >
                  <button className="btn btn-ghost btn-icon doc-menu-btn" onClick={e => { e.stopPropagation(); setMenuFor(menuFor === doc.id ? null : doc.id); }}>
                    <MoreHorizontal size={16} />
                  </button>
                  {menuFor === doc.id && (
                    <div className="menu" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setMenuFor(null); renameDoc(doc); }}><Pencil size={14} /> Rename</button>
                      <button onClick={() => { setMenuFor(null); patchDoc(doc, { is_pinned: !doc.is_pinned }); }}><Pin size={14} /> {doc.is_pinned ? 'Unpin' : 'Pin'}</button>
                      <button className="danger" onClick={() => { setMenuFor(null); removeDoc(doc); }}><Trash2 size={14} /> Delete</button>
                    </div>
                  )}
                  <FileText size={22} style={{ color: 'var(--primary)' }} />
                  <div>
                    <p className="title">{doc.title}</p>
                    <div className="meta">
                      {doc.is_pinned && <Star size={12} style={{ color: 'var(--warning)' }} />}
                      <span className="badge">{doc.mode === 'code' ? 'Code' : doc.mode === 'slides' ? 'Slides' : doc.mode === 'sheets' ? 'Sheet' : 'Document'}</span>
                      {doc.role && doc.role !== 'owner' && <span className="badge badge-pro">Shared • {doc.role}</span>}
                      <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <CommandPalette commands={dashCommands} />

      {showUpgrade && (
        <div className="modal-backdrop" onClick={() => setShowUpgrade(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h2 style={{ margin: 0 }}>Upgrade to Pro</h2>
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