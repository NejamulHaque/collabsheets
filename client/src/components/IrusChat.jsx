import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, KeyRound, Bot, Sparkles, Settings2, AlertCircle, Trash2, ExternalLink } from 'lucide-react';

const SUGGESTIONS = [
  'What can you help me with?',
  'Explain real-time collaboration',
  'Write a summary of this document',
  'Help me debug this code',
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
    if (!key) { 
      setShowSettings(true); 
      return alert('Please paste your Irus AI API key first 🔑 (tap ⚙)'); 
    }
    setQ('');
    setMsgs(m => [...m, { role: 'user', text: question }]);
    setLoading(true);

    try {
      // Send conversation history for context
      const history = msgs.slice(-10).map(m => ({ 
        role: m.role === 'user' ? 'user' : 'assistant', 
        content: m.text 
      }));

      const res = await fetch('/api/irus-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: question, 
          apiKey: key, 
          history,
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        setMsgs(m => [...m, { 
          role: 'ai', 
          text: `⚠️ Irus AI error: ${json.error || res.statusText}\n\nPlease check your API key in ⚙ settings or get one at irus-ai.onrender.com` 
        }]);
      } else {
        const answer = extract(json) || extract(json.data) || '(empty reply from Irus AI)';
        setMsgs(m => [...m, { role: 'ai', text: answer }]);
      }
    } catch (e) {
      setMsgs(m => [...m, { 
        role: 'ai', 
        text: `⚠️ Network error: ${e.message}\n\nIs the backend running?` 
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
            <Bot size={16} style={{ color: 'var(--accent)' }} /> Irus AI Assistant
            <button className="btn btn-ghost btn-icon" title="Settings & API key" onClick={() => setShowSettings(s => !s)}>
              <Settings2 size={14} />
            </button>
            <button className="btn btn-ghost btn-icon" title="Clear chat" onClick={() => setMsgs([])}>
              <Trash2 size={14} />
            </button>
            <button className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}>
              <X size={14} />
            </button>
          </div>

          {(showSettings || !key) && (
            <div style={{ padding: '12px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <KeyRound size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <input 
                  className="input" 
                  style={{ padding: '8px 10px', fontSize: 12 }} 
                  type="password"
                  placeholder="Paste your Irus AI API key" 
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
                <ExternalLink size={11} /> Get an API key at irus-ai.onrender.com
              </a>
              <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                Your key is stored locally in this browser. Requests go through our secure backend proxy.
              </div>
            </div>
          )}

          <div className="irus-msgs">
            {msgs.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', padding: '0 16px' }}>
                <Sparkles size={24} style={{ color: 'var(--primary)' }} />
                <div style={{ fontWeight: 600 }}>
                  {key ? 'Irus AI is ready!' : 'Connect your Irus AI account'}
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                  {key 
                    ? 'Ask anything about your documents, code, or get help with any task.' 
                    : 'Get your free API key at irus-ai.onrender.com and paste it above.'}
                </div>
                {key && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 8 }}>
                    {SUGGESTIONS.map(s => (
                      <button 
                        key={s} 
                        className="btn btn-ghost" 
                        style={{ padding: '5px 12px', fontSize: 11 }} 
                        onClick={() => ask(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`irus-bubble ${m.role === 'user' ? 'me' : ''}`}>
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