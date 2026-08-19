import { Users, Sparkles, Code2 } from 'lucide-react';

export default function AuthLayout({ children }) {
  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <div className="logo"><div className="logo-mark">⌘</div> CollabSheets</div>
        <h1>Work together, in real time.</h1>
        <p>A collaborative workspace with a dual code & document editor, live cursors, AI assistance and version-safe autosave.</p>
        <div className="feature-row"><div className="feature-dot"><Users size={16} /></div> Live multiplayer editing with presence</div>
        <div className="feature-row"><div className="feature-dot"><Code2 size={16} /></div> Code + MS-Word docs + PowerPoint slides</div>
        <div className="feature-row"><div className="feature-dot"><Sparkles size={16} /></div> Irus AI built into your editor</div>
      </div>
      <div className="auth-side">
        <div className="auth-card glass">{children}</div>
      </div>
    </div>
  );
}