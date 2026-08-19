import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, useAuthStore } from '../store/authStore';
import { ArrowLeft, Crown, Save, Mail, Calendar, Clock, ShieldCheck, Award, FileText, Star, LogOut } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function Profile() {
  const { user, hydrate, logout } = useAuthStore();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [payments, setPayments] = useState([]);
  const [docs, setDocs] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    hydrate();
    API.get('/billing/my-payments').then(r => setPayments(r.data)).catch(() => {});
    API.get('/documents').then(r => setDocs(r.data)).catch(() => {});
  }, []);
  useEffect(() => { if (user) { setUsername(user.username || ''); setBio(user.bio || ''); } }, [user]);

  const save = async () => {
    await API.patch('/users/me', { username, bio });
    await hydrate();
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const latest = payments[0];
  const achievements = [
    { icon: <Award size={14} />, t: 'Founding Member', on: true },
    { icon: <Crown size={14} />, t: 'Pro', on: user?.tier === 'pro' },
    { icon: <ShieldCheck size={14} />, t: 'Admin', on: !!user?.is_admin },
    { icon: <FileText size={14} />, t: 'Creator', on: docs.length > 0 },
    { icon: <Star size={14} />, t: 'Curator', on: docs.some(d => d.is_pinned) },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ✅ Back to Dashboard button */}
      <button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/dashboard')}>
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* Cover card */}
      <div className="glass" style={{ overflow: 'hidden', padding: 0 }}>
        <div className="profile-cover" />
        <div style={{ padding: '0 28px 24px' }}>
          {/* ✅ zIndex fixes avatar/name hiding under the cover */}
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end', marginTop: -44, flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
            <div className="profile-avatar">{user?.username?.charAt(0).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 200, paddingBottom: 4 }}>
              <h2 style={{ margin: 0 }}>{user?.username}</h2>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                {user?.tier === 'pro' ? <span className="badge badge-pro"><Crown size={12} /> Pro member</span> : <span className="badge">Free plan</span>}
                {user?.is_admin && <span className="badge" style={{ color: 'var(--accent)' }}><ShieldCheck size={12} /> Admin</span>}
                {latest?.status === 'pending' && <span className="badge" style={{ color: 'var(--warning)' }}><Clock size={12} /> Payment under review</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>
              <ThemeToggle />
              <button className="btn btn-ghost" onClick={() => { logout(); navigate('/login'); }}><LogOut size={14} /> Log out</button>
            </div>
          </div>

          <div className="stats-grid" style={{ marginTop: 20, marginBottom: 0 }}>
            <div className="stat-card glass"><span className="label">Documents</span><span className="value">{docs.length}</span></div>
            <div className="stat-card glass"><span className="label">Pinned</span><span className="value">{docs.filter(d => d.is_pinned).length}</span></div>
            <div className="stat-card glass"><span className="label">AI today</span><span className="value">{user?.tier === 'pro' ? '∞' : `${user?.ai_requests_today || 0}/5`}</span></div>
            <div className="stat-card glass"><span className="label">Payments</span><span className="value">{payments.length}</span></div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            {achievements.map((a, i) => (
              <span key={i} className="badge" style={{ opacity: a.on ? 1 : .35, borderColor: a.on ? 'var(--primary)' : 'var(--border)' }}>{a.icon}{a.t}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="profile-grid">
        <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ margin: 0 }}>Profile details</h3>
          <label className="plabel">Username</label>
          <input className="input" value={username} onChange={e => setUsername(e.target.value)} />
          <label className="plabel">Email (cannot change)</label>
          <input className="input" value={user?.email || ''} disabled style={{ opacity: .6 }} />
          <label className="plabel">Bio</label>
          <textarea className="input" rows={3} placeholder="Tell collaborators about yourself…" value={bio} onChange={e => setBio(e.target.value)} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--muted)', fontSize: 13, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Mail size={14} /> {user?.email}</span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Calendar size={14} /> Member since {new Date().toLocaleDateString()}</span>
          </div>
          <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={save}><Save size={14} /> {saved ? 'Saved ✓' : 'Save changes'}</button>
        </div>

        <div className="glass" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 12px' }}>Payment history</h3>
          {payments.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13.5 }}>No payments yet.</div>
          ) : payments.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span>₹{p.amount} • {new Date(p.created_at).toLocaleDateString()}</span>
              <span style={{ color: p.status === 'approved' ? 'var(--success)' : p.status === 'pending' ? 'var(--warning)' : 'var(--danger)', fontWeight: 600, textTransform: 'capitalize' }}>{p.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}