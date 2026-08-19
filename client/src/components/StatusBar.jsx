import { GitBranch, Check, Wifi } from 'lucide-react';

export default function StatusBar({ language, cursor, online, saveState, words }) {
  return (
    <div className="status-bar">
      <span className="sb-item"><GitBranch size={12} /> main</span>
      <span className="sb-item"><Check size={12} /> {saveState === 'saved' ? 'Synced' : 'Syncing…'}</span>
      <span className="sb-item">⚠ 0  0</span>
      <div style={{ flex: 1 }} />
      {words != null && <span className="sb-item">{words} words</span>}
      <span className="sb-item">Ln {cursor.line}, Col {cursor.col}</span>
      <span className="sb-item">Spaces: 2</span>
      <span className="sb-item">UTF-8</span>
      <span className="sb-item">{language}</span>
      <span className="sb-item"><Wifi size={12} /> {online} online</span>
    </div>
  );
}