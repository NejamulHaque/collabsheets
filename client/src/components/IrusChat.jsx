import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, KeyRound, Bot, Sparkles, Settings2, AlertCircle } from 'lucide-react';

export default function IrusChat() {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [key, setKey] = useState(localStorage.getItem('cs-irus-key') || '');
  const [msgs, setMsgs] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, open]);

  const saveKey = (v) => { setKey(v); localStorage.setItem('cs-irus-key', v); };

  const extract = (data) => {
    if (typeof data === 'string') return data;
    return data?.reply || data?.answer || data?.response || data?.message || data?.output ||
      data?.result || data?.text || data?.content ||
      data?.data?.reply || data?.data?.answer || data?.data?.message ||
      (Array.isArray(data) ? data.map(x => x?.text || x?.content || JSON.stringify(x)).join('\n') : JSON.stringify(data));
  };

  const ask = async () => {
    const question = q.trim();
    if (!question || loading) return;
    if (!key) return alert('Please paste your Irus AI API key first 🔑 (tap ⚙)');
    setQ('');
    setMsgs(m => [...m, { role: 'user', text: question }]);
    setLoading(true);

    try {
      const res = await fetch('/api/irus-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, apiKey: key }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setMsgs(m => [...m, { role: 'ai', text: `⚠️ Irus AI error: ${json.error || res.statusText}. Check your API key in ⚙ settings.` }]);
      } else {
        setMsgs(m => [...m, { role: 'ai', text: extract(json.data) }]);
      }
    } catch (e) {
      setMsgs(m => [...m, { role: 'ai', text: `⚠️ Network error: ${e.message}. Is the backend running on port 5001?` }]);
    }
    setLoading(false);
  };

  return (
    <>
      <button className="chat-fab" onClick={() => setOpen(o => !o)}>
        <MessageCircle size={18} /> {open ? 'Close' : 'Ask Irus AI'}
      </button>

      {open && (
        <div className="irus-panel">
          <div className="float-head">
            <Bot size={16} style={{ color: 'var(--accent)' }} /> Irus AI Assistant
            <button className="btn btn-ghost btn-icon" title="API key settings" onClick={() => setShowSettings(s => !s)}><Settings2 size={14} /></button>
            <button className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}><X size={14} /></button>
          </div>

          {(showSettings || !key) && (
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <KeyRound size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <input className="input" style={{ padding: '7px 10px', fontSize: 12 }} type="password"
                  placeholder="Paste your Irus AI API key (irus_...)" value={key}
                  onChange={e => saveKey(e.target.value)} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                Your key is stored locally in this browser only. Requests go through our backend proxy — CORS-safe.
              </div>
            </div>
          )}

          <div className="irus-msgs">
            {msgs.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginTop: 30, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', padding: '0 16px' }}>
                <Sparkles size={22} style={{ color: 'var(--primary)' }} />
                {key ? 'Ask anything — Irus AI is ready.' : 'Add your Irus AI API key above to start chatting.'}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`irus-bubble ${m.role === 'user' ? 'me' : ''}`}>{m.text}</div>
            ))}
            {loading && <div className="irus-bubble"><span className="spin">⟳</span> thinking…</div>}
            <div ref={endRef} />
          </div>

          <div style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid var(--border)' }}>
            <input className="input" placeholder="Type your question…" value={q}
              onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask()} />
            <button className="btn btn-primary btn-icon" onClick={ask} disabled={loading || !q.trim()}><Send size={15} /></button>
          </div>
        </div>
      )}
    </>
  );
}