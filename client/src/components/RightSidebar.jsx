import { useEffect, useRef, useState } from 'react';
import { API, useAuthStore } from '../store/authStore';
import { MessageCircle, X, Send, RotateCcw } from 'lucide-react';

// ✅ Treat DB timestamps as UTC, display in the viewer's local timezone
const dbDate = (s) => {
  if (!s) return new Date();
  const str = String(s);
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(str)) return new Date(str);
  return new Date(str.replace(' ', 'T') + 'Z');
};

export default function RightSidebar({ docId, onRestore }) {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [versions, setVersions] = useState([]);
  const [text, setText] = useState('');
  const listRef = useRef(null);

  // ✅ Open the chat when the header chat button is clicked
  useEffect(() => {
    const openChat = () => { setIsOpen(true); setTab('chat'); };
    window.addEventListener('cs-open-chat', openChat);
    return () => window.removeEventListener('cs-open-chat', openChat);
  }, []);

  useEffect(() => {
    if (!isOpen || !docId) return;
    const load = () => {
      if (tab === 'chat') {
        API.get(`/documents/${docId}/messages`).then(r => setMessages(r.data || [])).catch(() => {});
      } else {
        API.get(`/documents/${docId}/versions`).then(r => setVersions(r.data || [])).catch(() => {});
      }
    };
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [isOpen, tab, docId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, isOpen, tab]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    try {
      const { data } = await API.post(`/documents/${docId}/messages`, { text: text.trim() });
      setMessages(m => [...m, { ...data, username: data.username || user?.username || 'User' }]);
      setText('');
    } catch (e) { console.error('Chat error:', e); }
  };

  return (
    <>
      <button className="float-dock" onClick={() => setIsOpen(o => !o)} title="Chat & History">
        <MessageCircle size={20} />
      </button>

      {isOpen && (
        <>
          <div className="right-sidebar-backdrop" onClick={() => setIsOpen(false)} />
          <aside className="right-sidebar glass">
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`btn btn-sm ${tab === 'chat' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('chat')}>💬 Chat</button>
              <button className={`btn btn-sm ${tab === 'history' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('history')}>🕒 History</button>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={() => setIsOpen(false)}><X size={16} /></button>
          </header>

          {tab === 'chat' && (
            <>
              <div className="chat-list" ref={listRef}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 20, fontSize: 13 }}>
                    No messages yet. Say hi to your team!
                  </div>
                )}
                {messages.map(msg => (
                  <div key={msg.id} className={`chat-bubble ${String(msg.user_id) === String(user?.id) ? 'mine' : 'theirs'}`}>
                    <div className="chat-meta">
                      <span style={{ fontWeight: 700 }}>{msg.username || 'User'}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {dbDate(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="chat-text">{msg.text}</div>
                  </div>
                ))}
              </div>
              <div className="chat-input-wrap">
                <input
                  className="input"
                  placeholder="Type a message..."
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                />
                <button className="btn btn-primary btn-icon" onClick={sendMessage}><Send size={15} /></button>
              </div>
            </>
          )}

          {tab === 'history' && (
            <div className="chat-list">
              {versions.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 20, fontSize: 13 }}>
                  No saved versions yet.
                </div>
              )}
              {versions.map(v => (
                <div key={v.id} className="glass" style={{ padding: 12, marginBottom: 8, borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title || 'Snapshot'}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{dbDate(v.created_at).toLocaleString()}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }} onClick={() => onRestore && onRestore(v.id)}>
                    <RotateCcw size={13} /> Restore
                  </button>
                </div>
              ))}
            </div>
          )}
          </aside>
        </>
      )}
    </>
  );
}