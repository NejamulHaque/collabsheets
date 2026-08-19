import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../store/authStore';
import { ArrowLeft, ShieldCheck, Users, Crown, Clock, IndianRupee, Check, X, FileText, Activity, Trash2, UserCog } from 'lucide-react';

const TABS = ['Overview', 'Payments', 'Users', 'Documents', 'Activity'];

function Bars({ data }) {
  const safeData = data || [];
  const max = Math.max(...safeData.map(d => d.value || 0), 1);
  return (
    <div className="chart">
      {safeData.map((d, i) => (
        <div key={i} className="chart-col">
          <div className="chart-bar" style={{ height: `${((d.value || 0) / max) * 100}%`, background: 'var(--primary)' }} />
          <span>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('Overview');
  
  // ✅ FIXED: Added parentheses and default empty object to prevent crash
  const [stats, setStats] = useState({ users: 0, pros: 0, pending: 0, revenue: 0, docs: 0, runs: 0, ai: 0, signups: [], pays: [] });
  const [payments, setPayments] = useState([]);
  const [users, setUsers] = useState([]);
  const [docs, setDocs] = useState([]);
  const [activity, setActivity] = useState([]);

  const load = () => {
    API.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
    API.get('/admin/payments').then(r => setPayments(r.data)).catch(() => {});
    API.get('/admin/users').then(r => setUsers(r.data)).catch(() => {});
    API.get('/admin/documents').then(r => setDocs(r.data)).catch(() => {});
    API.get('/admin/activity').then(r => setActivity(r.data)).catch(() => {});
  };
  useEffect(load, []);

  // ✅ FIXED: Using PATCH and sending { status } to match backend
  const approve = async (id) => { await API.patch(`/admin/payments/${id}`, { status: 'approved' }); load(); };
  const reject = async (id) => { await API.patch(`/admin/payments/${id}`, { status: 'rejected' }); load(); };
  
  // ✅ FIXED: Using PATCH for user updates
  const setTier = async (id, tier) => { await API.patch(`/admin/users/${id}`, { tier }); load(); };
  const toggleAdmin = async (id) => { await API.patch(`/admin/users/${id}/toggle-admin`); load(); };
  
  const delUser = async (id, name) => { if (window.confirm(`Delete user ${name}? All their data will be removed.`)) { await API.delete(`/admin/users/${id}`); load(); } };
  const delDoc = async (id, t) => { if (window.confirm(`Delete document "${t}"?`)) { await API.delete(`/admin/documents/${id}`); load(); } };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate('/dashboard')}><ArrowLeft size={16} /></button>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}><ShieldCheck style={{ color: 'var(--accent)' }} /> Admin Control Center</h2>
      </div>

      <div className="glass ribbon">
        <div className="ribbon-tabs">
          {TABS.map(t => <button key={t} className={`ribbon-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
        </div>
      </div>

      {tab === 'Overview' && stats && (<>
        <div className="stats-grid">
          <div className="stat-card glass"><span className="label">Users</span><span className="value">{stats.users}</span></div>
          <div className="stat-card glass"><span className="label">Pro members</span><span className="value">{stats.pros}</span></div>
          <div className="stat-card glass"><span className="label">Pending payments</span><span className="value" style={{ color: 'var(--warning)' }}>{stats.pending}</span></div>
          <div className="stat-card glass"><span className="label">Revenue</span><span className="value" style={{ color: 'var(--success)' }}>₹{stats.revenue}</span></div>
          <div className="stat-card glass"><span className="label">Documents</span><span className="value">{stats.docs}</span></div>
          <div className="stat-card glass"><span className="label">Code runs</span><span className="value">{stats.runs}</span></div>
          <div className="stat-card glass"><span className="label">AI requests</span><span className="value">{stats.ai}</span></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="glass" style={{ padding: 20 }}><h3 style={{ margin: '0 0 8px', fontSize: 15 }}>Signups (7 days)</h3><Bars data={stats.signups} /></div>
          <div className="glass" style={{ padding: 20 }}><h3 style={{ margin: '0 0 8px', fontSize: 15 }}>Approved payments (7 days)</h3><Bars data={stats.pays} /></div>
        </div>
      </>)}

      {tab === 'Payments' && (
        <div className="glass" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px' }}><Clock size={18} style={{ color: 'var(--warning)' }} /> Pending approvals</h3>
          {payments.filter(p => p.status === 'pending').length === 0 && <div style={{ color: 'var(--muted)' }}>No pending payments 🎉</div>}
          {payments.filter(p => p.status === 'pending').map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700 }}>{p.username} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>• {p.email}</span></div>
                <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>₹{p.amount} • UTR: {p.utr || '—'} • {new Date(p.created_at).toLocaleString()}</div>
              </div>
              <button className="btn btn-primary" onClick={() => approve(p.id)}><Check size={14} /> Approve → Pro</button>
              <button className="btn btn-danger" onClick={() => reject(p.id)}><X size={14} /> Reject</button>
            </div>
          ))}
          <h3 style={{ margin: '24px 0 12px' }}><IndianRupee size={18} style={{ color: 'var(--success)' }} /> All payments</h3>
          {payments.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{p.username} — ₹{p.amount} • {new Date(p.created_at).toLocaleDateString()}</span>
              <span style={{ color: p.status === 'approved' ? 'var(--success)' : p.status === 'pending' ? 'var(--warning)' : 'var(--danger)', textTransform: 'capitalize', fontWeight: 600 }}>{p.status}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'Users' && (
        <div className="glass" style={{ padding: 24 }}>
          {users.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 600 }}>{u.username} {u.is_admin && <span className="badge" style={{ marginLeft: 6 }}>admin</span>}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>{u.email} • joined {new Date(u.created_at).toLocaleDateString()}</div>
              </div>
              <span className={u.tier === 'pro' ? 'badge badge-pro' : 'badge'}>{u.tier}</span>
              <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setTier(u.id, u.tier === 'pro' ? 'free' : 'pro')}><Crown size={12} /> {u.tier === 'pro' ? 'Downgrade' : 'Make Pro'}</button>
              <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => toggleAdmin(u.id)}><UserCog size={12} /> {u.is_admin ? 'Remove Admin' : 'Make Admin'}</button>
              <button className="btn btn-danger btn-icon" onClick={() => delUser(u.id, u.username)}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}

      {tab === 'Documents' && (
        <div className="glass" style={{ padding: 24 }}>
          {docs.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <FileText size={16} style={{ color: 'var(--primary)' }} />
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{d.title}</div><div style={{ color: 'var(--muted)', fontSize: 12 }}>{d.owner || 'Unknown'} • {d.mode} • {new Date(d.updated_at).toLocaleString()}</div></div>
              <button className="btn btn-danger btn-icon" onClick={() => delDoc(d.id, d.title)}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}

      {tab === 'Activity' && (
        <div className="glass" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={18} style={{ color: 'var(--accent)' }} /> Live activity feed</h3>
          {activity.length === 0 && <div style={{ color: 'var(--muted)' }}>No recent activity.</div>}
          {activity.map((a, i) => (
            <div key={i} style={{ fontSize: 13.5, padding: '7px 0', borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
              <b style={{ color: 'var(--text)' }}>{a.title}</b>
              <span style={{ float: 'right', fontSize: 11.5 }}>{new Date(a.time).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}