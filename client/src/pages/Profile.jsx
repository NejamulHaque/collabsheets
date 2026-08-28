import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, useAuthStore } from '../store/authStore';
import {
  ArrowLeft, Crown, Save, Mail, Calendar, Clock, ShieldCheck,
  Award, FileText, Star, LogOut, Key, Settings, Palette,
  Code2, Sparkles, CheckCircle2, Sliders, Laptop, Lock,
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const BANNERS = [
  'linear-gradient(135deg, #7c5cff, #22d3ee)',
  'linear-gradient(135deg, #007acc, #0ea5e9)',
  'linear-gradient(135deg, #185abd, #60a5fa)',
  'linear-gradient(135deg, #107c41, #34d399)',
  'linear-gradient(135deg, #c43e1c, #fb923c)',
  'linear-gradient(135deg, #1e1e24, #2a2d34)',
];

export default function Profile() {
  const { user, hydrate, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'preferences', 'apikeys', 'billing'
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [bannerBg, setBannerBg] = useState(BANNERS[0]);
  const [irusKey, setIrusKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [defaultMode, setDefaultMode] = useState('code');
  const [payments, setPayments] = useState([]);
  const [docs, setDocs] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    hydrate();
    API.get('/billing/my-payments').then(r => setPayments(r.data)).catch(() => {});
    API.get('/documents').then(r => setDocs(r.data)).catch(() => {});
    const savedIrus = localStorage.getItem('irus_api_key') || '';
    setIrusKey(savedIrus);
  }, []);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setBio(user.bio || '');
    }
  }, [user]);

  const saveProfile = async () => {
    await API.patch('/users/me', { username, bio });
    if (irusKey) localStorage.setItem('irus_api_key', irusKey);
    await hydrate();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const achievements = [
    { icon: <Award size={14} />, t: 'Founding Member', on: true },
    { icon: <Crown size={14} />, t: 'Pro Creator', on: user?.tier === 'pro' },
    { icon: <ShieldCheck size={14} />, t: 'Verified Developer', on: true },
    { icon: <FileText size={14} />, t: 'Document Master', on: docs.length >= 3 },
    { icon: <Star size={14} />, t: 'Power User', on: docs.some(d => d.is_pinned) },
  ];

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Bar Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ThemeToggle />
          <button className="btn btn-ghost" onClick={() => { logout(); navigate('/login'); }}>
            <LogOut size={14} /> Log out
          </button>
        </div>
      </div>

      {/* Cover Header Card */}
      <div className="glass" style={{ overflow: 'hidden', padding: 0, borderRadius: 16 }}>
        <div
          className="profile-cover"
          style={{ background: bannerBg, height: 140, position: 'relative' }}
        >
          {/* Banner Color Palette Picker */}
          <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6, background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: 20, backdropFilter: 'blur(8px)' }}>
            {BANNERS.map((b, i) => (
              <button
                key={i}
                style={{ width: 18, height: 18, borderRadius: '50%', background: b, border: bannerBg === b ? '2px solid #fff' : '1px solid rgba(255,255,255,0.4)', cursor: 'pointer' }}
                onClick={() => setBannerBg(b)}
              />
            ))}
          </div>
        </div>

        <div style={{ padding: '0 28px 24px' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', marginTop: -50, flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
            <div className="profile-avatar" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 220, paddingBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{user?.username}</h2>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {user?.tier === 'pro' ? (
                  <span className="badge badge-pro"><Crown size={12} /> Pro Member</span>
                ) : (
                  <span className="badge">Free Plan</span>
                )}
                {user?.is_admin && (
                  <span className="badge" style={{ color: 'var(--accent)' }}><ShieldCheck size={12} /> Admin</span>
                )}
                <span className="badge" style={{ color: 'var(--muted)' }}><Mail size={12} /> {user?.email}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="stats-grid" style={{ marginTop: 24, marginBottom: 0 }}>
            <div className="stat-card glass"><span className="label">Total Documents</span><span className="value">{docs.length}</span></div>
            <div className="stat-card glass"><span className="label">Starred / Pinned</span><span className="value">{docs.filter(d => d.is_pinned).length}</span></div>
            <div className="stat-card glass"><span className="label">AI Requests Daily</span><span className="value">{user?.tier === 'pro' ? '∞ Unlimited' : `${user?.ai_requests_today || 0}/5`}</span></div>
            <div className="stat-card glass"><span className="label">Workspace Tier</span><span className="value" style={{ textTransform: 'capitalize' }}>{user?.tier || 'Free'}</span></div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
        {[
          { id: 'overview', label: '👤 Account Overview' },
          { id: 'preferences', label: '⚙️ Editor Preferences' },
          { id: 'apikeys', label: '🔑 API & AI Keys' },
          { id: 'billing', label: '💳 Plan & Billing' },
        ].map(t => (
          <button
            key={t.id}
            className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 8, padding: '8px 16px', fontSize: 13 }}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 1️⃣ OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="profile-grid">
          <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Personal Information</h3>

            <div>
              <label className="plabel">Display Name</label>
              <input className="input" value={username} onChange={e => setUsername(e.target.value)} />
            </div>

            <div>
              <label className="plabel">Email Address (Read-only)</label>
              <input className="input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
            </div>

            <div>
              <label className="plabel">Bio / Description</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Tell your team about your role, projects, and expertise…"
                value={bio}
                onChange={e => setBio(e.target.value)}
              />
            </div>

            <button className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={saveProfile}>
              <Save size={14} /> {saved ? 'Saved ✓' : 'Save Changes'}
            </button>
          </div>

          <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Badges & Achievements</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {achievements.map((a, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: a.on ? 'var(--glass)' : 'transparent',
                    border: `1px solid ${a.on ? 'var(--primary)' : 'var(--border)'}`,
                    opacity: a.on ? 1 : 0.45,
                  }}
                >
                  <span style={{ color: a.on ? 'var(--accent)' : 'var(--muted)' }}>{a.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: 13.5 }}>{a.t}</span>
                  {a.on && <CheckCircle2 size={15} style={{ marginLeft: 'auto', color: 'var(--success)' }} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2️⃣ PREFERENCES TAB */}
      {activeTab === 'preferences' && (
        <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Editor Configuration</h3>

          <div>
            <label className="plabel">Default Workspace Creation Mode</label>
            <select className="input" value={defaultMode} onChange={e => setDefaultMode(e.target.value)}>
              <option value="code">💻 Visual Studio Code (IDE)</option>
              <option value="richtext">📄 Microsoft Word 365 (Document)</option>
              <option value="sheets">📊 Microsoft Excel 365 (Spreadsheet)</option>
              <option value="slides">📽 Microsoft PowerPoint 365 (Slides)</option>
              <option value="whiteboard">🎨 Whiteboard Canvas</option>
            </select>
          </div>

          <div>
            <label className="plabel">Code Editor Font Family</label>
            <select className="input" defaultValue="Fira Code">
              <option>Fira Code, Consolas, monospace</option>
              <option>JetBrains Mono, monospace</option>
              <option>Source Code Pro, monospace</option>
              <option>Courier New, monospace</option>
            </select>
          </div>

          <div>
            <label className="plabel">Indentation Tab Size</label>
            <select className="input" defaultValue="2">
              <option value="2">2 Spaces</option>
              <option value="4">4 Spaces</option>
              <option value="8">8 Spaces</option>
            </select>
          </div>

          <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={saveProfile}>
            <Save size={14} /> {saved ? 'Saved ✓' : 'Save Preferences'}
          </button>
        </div>
      )}

      {/* 3️⃣ API KEYS TAB */}
      {activeTab === 'apikeys' && (
        <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>AI Integration & Custom API Keys</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>
            Configure your Irus AI and third-party keys for custom model completions in VS Code, Word, and Excel.
          </p>

          <div>
            <label className="plabel">Irus AI Custom API Key</label>
            <input
              className="input"
              type="password"
              placeholder="irus_ai_live_xxxxxxxxxxxxxxxx"
              value={irusKey}
              onChange={e => setIrusKey(e.target.value)}
            />
          </div>

          <div>
            <label className="plabel">OpenAI API Key (Optional)</label>
            <input
              className="input"
              type="password"
              placeholder="sk-proj-xxxxxxxxxxxxxxxx"
              value={openaiKey}
              onChange={e => setOpenaiKey(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={saveProfile}>
            <Save size={14} /> {saved ? 'Saved ✓' : 'Save API Keys'}
          </button>
        </div>
      )}

      {/* 4️⃣ BILLING TAB */}
      {activeTab === 'billing' && (
        <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Billing & Payment Invoices</h3>
          {payments.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13.5, padding: '12px 0' }}>
              No payments recorded yet. You are currently on the Free tier.
            </div>
          ) : (
            payments.map(p => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 13.5,
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span>₹{p.amount} • {new Date(p.created_at).toLocaleDateString()}</span>
                <span
                  style={{
                    color: p.status === 'approved' ? 'var(--success)' : p.status === 'pending' ? 'var(--warning)' : 'var(--danger)',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                >
                  {p.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}