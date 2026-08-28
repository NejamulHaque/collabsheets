import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, KeyRound, Bot, Sparkles, Settings2, Trash2, ExternalLink } from 'lucide-react';

const SUGGESTIONS = [
  'What features does Collab-Sheets have?',
  'How do I run Python or JavaScript code?',
  'How do Excel formulas work in Collab-Sheets?',
  'Tell me about real-time CRDT sync',
];

export default function IrusChat() {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [key, setKey] = useState(localStorage.getItem('cs-irus-key') || '');
  const [msgs, setMsgs] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open, loading]);

  const saveKey = (v) => {
    setKey(v);
    localStorage.setItem('cs-irus-key', v);
  };

  const extract = (data) => {
    if (typeof data === 'string') return data;
    return data?.reply || data?.answer || data?.response || data?.message || data?.output ||
      data?.result || data?.text || data?.content ||
      data?.data?.reply || data?.data?.answer || data?.data?.message ||
      (Array.isArray(data) ? data.map(x => x?.text || x?.content || JSON.stringify(x)).join('\n') : '');
  };

  const ask = async (text) => {
    const question = (text ?? q).trim();
    if (!question || loading) return;
    setQ('');
    setMsgs(m => [...m, { role: 'user', text: question }]);
    setLoading(true);

    try {
      const history = msgs.slice(-8).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await fetch('/api/irus-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          prompt: question,
          apiKey: key,
          history,
        }),
      });
      const json = await res.json().catch(() => ({}));

      const answer = extract(json) || extract(json.data) || '🤖 Irus AI is ready to assist you in Collab-Sheets!';
      setMsgs(m => [...m, { role: 'ai', text: answer }]);
    } catch (e) {
      setMsgs(m => [...m, {
        role: 'ai',
        text: `🤖 Irus AI: I am ready to help you write code, format documents, calculate formulas, and create presentation slides in Collab-Sheets!`
      }]);
    }
    setLoading(false);
  };

  return (
    <>
      <button className="chat-fab" onClick={() => setOpen(o => !o)}>
        <MessageCircle size={18} /> {open ? 'Close' : 'Irus AI'}
      </button>

      {open && (
        <div className="irus-panel">
          <div className="float-head">
            <Bot size={16} style={{ color: 'var(--accent)' }} /> Irus AI Copilot
            <button className="btn btn-ghost btn-icon" title="Settings & Custom API Key" onClick={() => setShowSettings(s => !s)}>
              <Settings2 size={14} />
            </button>
            <button className="btn btn-ghost btn-icon" title="Clear chat" onClick={() => setMsgs([])}>
              <Trash2 size={14} />
            </button>
            <button className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}>
              <X size={14} />
            </button>
          </div>

          {showSettings && (
            <div style={{ padding: '12px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <KeyRound size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <input
                  className="input"
                  style={{ padding: '6px 10px', fontSize: 12 }}
                  type="password"
                  placeholder="Optional custom Irus API key"
                  value={key}
                  onChange={e => saveKey(e.target.value)}
                />
              </div>
              <a
                href="https://irus-ai.onrender.com/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11, color: 'var(--primary)', display: 'flex', gap: 4, alignItems: 'center' }}
              >
                <ExternalLink size={11} /> Irus AI Cloud Dashboard
              </a>
            </div>
          )}

          <div className="irus-msgs">
            {msgs.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', padding: '0 16px' }}>
                <Sparkles size={26} style={{ color: 'var(--primary)' }} />
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                  Irus AI Copilot is Ready
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                  Ask anything about code, documents, spreadsheets, or slides in Collab-Sheets!
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 6 }}>
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      className="btn btn-ghost"
                      style={{ padding: '4px 10px', fontSize: 11, borderRadius: 999 }}
                      onClick={() => ask(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`irus-bubble ${m.role === 'user' ? 'me' : ''}`} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="irus-bubble">
                <span className="spin">⟳</span> Irus is thinking…
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid var(--border)' }}>
            <input
              className="input"
              placeholder="Ask Irus AI anything…"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && ask()}
            />
            <button
              className="btn btn-primary btn-icon"
              onClick={() => ask()}
              disabled={loading || !q.trim()}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}