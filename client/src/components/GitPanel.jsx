import { useState } from 'react';
import { GitBranch, GitCommit, CloudUpload, X, History } from 'lucide-react';

export default function GitPanel({ docId, getFiles, setFileContent, onPush }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [commits, setCommits] = useState(() => { try { return JSON.parse(localStorage.getItem('cs-git-' + docId) || '[]'); } catch { return []; } });
  const [, tick] = useState(0);

  const save = (next) => { setCommits(next); localStorage.setItem('cs-git-' + docId, JSON.stringify(next)); tick(x => x + 1); };

  const last = commits[0];
  const changes = getFiles().map(f => {
    const prev = last?.files?.[f.name];
    if (prev === undefined) return { name: f.name, status: 'A', add: f.content.split('\n').length, del: 0 };
    if (prev === f.content) return null;
    const a = f.content.split('\n'), b = prev.split('\n');
    return { name: f.name, status: 'M', add: a.filter(l => !b.includes(l)).length, del: b.filter(l => !a.includes(l)).length };
  }).filter(Boolean);

  const commit = () => {
    if (!msg.trim()) return alert('Write a commit message first');
    const files = {}; getFiles().forEach(f => files[f.name] = f.content);
    save([{ id: Date.now(), msg: msg.trim(), time: new Date().toLocaleString(), files, pushed: false }, ...commits].slice(0, 20));
    setMsg('');
  };

  const push = async () => {
    if (!last) return;
    await onPush();
    save([{ ...last, pushed: true }, ...commits.slice(1)]);
  };

  const restore = (c) => {
    if (!window.confirm(`Restore "${c.msg}"?`)) return;
    Object.entries(c.files).forEach(([name, text]) => setFileContent(name, text));
  };

  return (
    <>
      <button className="float-btn git-fab" onClick={() => setOpen(!open)}><GitBranch size={16} /> Git</button>
      {open && (
        <div className="float-panel glass git-panel">
          <div className="float-head"><GitBranch size={15} /> Source Control<button className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}><X size={14} /></button></div>
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>CHANGES ({changes.length})</div>
            {changes.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Working tree clean ✅</div>}
            {changes.map(c => (
              <div key={c.name} style={{ display: 'flex', gap: 8, fontSize: 13, alignItems: 'center' }}>
                <span className="badge" style={{ color: c.status === 'A' ? 'var(--success)' : 'var(--warning)' }}>{c.status}</span>
                <span style={{ flex: 1 }}>{c.name}</span>
                <span style={{ color: 'var(--success)', fontSize: 11 }}>+{c.add}</span>
                <span style={{ color: 'var(--danger)', fontSize: 11 }}>-{c.del}</span>
              </div>
            ))}
            <input className="input" placeholder="Commit message…" value={msg} onChange={e => setMsg(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={commit}><GitCommit size={14} /> Commit</button>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={push} disabled={!last || last.pushed}><CloudUpload size={14} /> Push</button>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginTop: 6 }}><History size={12} /> HISTORY</div>
            {commits.map(c => (
              <div key={c.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8, fontSize: 12.5 }}>
                <div style={{ fontWeight: 600 }}>{c.msg} {c.pushed && <span style={{ color: 'var(--success)' }}>☁ pushed</span>}</div>
                <div style={{ color: 'var(--muted)', fontSize: 11, margin: '3px 0 6px' }}>{c.time}</div>
                <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => restore(c)}>Restore</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}