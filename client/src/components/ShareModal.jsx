import { useEffect, useState } from 'react';
import { API } from '../store/authStore';
import { X, Lock, Globe, Pencil, UserPlus, Copy, Check, Trash2 } from 'lucide-react';

export default function ShareModal({ docId, onClose }) {
  const [level, setLevel] = useState('private');
  const [token, setToken] = useState('');
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [copied, setCopied] = useState(false);

  const load = async () => {
    try {
      const { data } = await API.get(`/documents/${docId}/share`);
      setLevel(data.level || 'private');
      setToken(data.token || '');
    } catch {}
    try {
      const { data } = await API.get(`/documents/${docId}/members`);
      setMembers(data || []);
    } catch {}
  };
  useEffect(() => { load(); }, [docId]);

  const changeLevel = async (lvl) => {
    setLevel(lvl);
    try {
      const { data } = await API.post(`/documents/${docId}/share`, { level: lvl });
      if (data.token) setToken(data.token);
    } catch { alert('Failed to update share settings'); }
  };

  const link = `${window.location.origin}/s/${token}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  const invite = async () => {
    if (!email.trim()) return;
    try {
      await API.post(`/documents/${docId}/members`, { email: email.trim(), role });
      setEmail(''); load();
    } catch (e) { alert(e.response?.data?.error || 'Failed to invite'); }
  };

  const removeMember = async (id) => {
    try { await API.delete(`/documents/${docId}/members/${id}`); load(); } catch {}
  };

  const options = [
    { id: 'private', icon: <Lock size={16} />, t: 'Private', d: 'Only you (and invited members)' },
    { id: 'view', icon: <Globe size={16} />, t: 'Anyone with link — view', d: 'Read-only access' },
    { id: 'edit', icon: <Pencil size={16} />, t: 'Anyone with link — edit', d: 'Full editing access' },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 470 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>Share & Collaborate</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map(o => (
            <button key={o.id} onClick={() => changeLevel(o.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12,
                border: level === o.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                background: level === o.id ? 'rgba(124,92,255,.08)' : 'var(--glass)',
                cursor: 'pointer', textAlign: 'left', color: 'var(--text)',
              }}>
              {o.icon}
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>{o.t}</span>
                <span style={{ display: 'block', color: 'var(--muted)', fontSize: 12 }}>{o.d}</span>
              </span>
            </button>
          ))}
        </div>

        {level !== 'private' && token && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input className="input" readOnly value={link} style={{ fontSize: 12 }} />
            <button className="btn btn-primary btn-icon" onClick={copy} title="Copy link">
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
            <UserPlus size={16} /> Invite team members
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" placeholder="member@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            <select className="tb-select" value={role} onChange={e => setRole(e.target.value)}>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button className="btn btn-primary" onClick={invite}>Invite</button>
          </div>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13.5 }}>
              <span style={{ flex: 1 }}>{m.user_email}</span>
              <span className="badge">{m.role}</span>
              <button className="btn btn-ghost btn-icon" onClick={() => removeMember(m.id)}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}