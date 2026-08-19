import { useState } from 'react';
import { API } from '../store/authStore';
import { Sparkles, X, Send, Copy, Download, Crown, Bot } from 'lucide-react';

export default function AIPanel({ getContext, onInsert, tier }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const quickActions = ['Explain this', 'Refactor this', 'Find bugs', 'Add comments'];

  const send = async (text) => {
    const finalPrompt = text || prompt;
    if (!finalPrompt.trim() || loading) return;
    setPrompt('');
    setMessages((m) => [...m, { role: 'user', content: finalPrompt }]);
    setLoading(true);
    try {
      const { data } = await API.post('/ai/generate', { prompt: finalPrompt, context: getContext() });
      const reply = data.response || data.answer || data.message || data.reply || (typeof data === 'string' ? data : JSON.stringify(data));
      setMessages((m) => [...m, { role: 'ai', content: reply }]);
    } catch (err) {
      const msg = err.response?.status === 429
        ? '⚠️ Daily AI limit reached (5/5). Upgrade to Pro for unlimited AI!'
        : err.response?.data?.error || 'Irus AI is sleeping or unavailable. Try again in a few seconds.';
      setMessages((m) => [...m, { role: 'ai', content: msg }]);
    }
    setLoading(false);
  };

  return (
    <>
      <button onClick={() => setOpen(!open)} className="btn btn-primary" title="Irus AI Assistant"
        style={{
          position: 'fixed', bottom: '24px', left: '24px', zIndex: 100,
          width: '56px', height: '56px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 30px rgba(139, 92, 246, 0.4)',
        }}>
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </button>

      {open && (
        <div className="glass" style={{
          position: 'fixed', bottom: '96px', left: '24px', zIndex: 100,
          width: '380px', maxWidth: 'calc(100vw - 48px)', height: '520px',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: 'var(--glass-strong)',
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bot size={20} style={{ color: 'var(--accent)' }} />
            <div>
              <div style={{ fontWeight: 'bold' }}>Irus AI</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{tier === 'pro' ? 'Pro • Unlimited requests' : 'Free • 5 requests/day'}</div>
            </div>
            {tier !== 'pro' && (
              <button className="btn btn-ghost" style={{ marginLeft: 'auto', padding: '6px 10px', fontSize: '12px' }}><Crown size={12} /> Upgrade</button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: '14px', textAlign: 'center', marginTop: '40px' }}>
                Ask Irus AI anything about your document.<br />Try a quick action below! 👇
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                background: m.role === 'user' ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'rgba(255,255,255,0.08)',
                padding: '10px 14px', borderRadius: '14px', maxWidth: '85%',
                fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: 1.5,
              }}>
                {m.content}
                {m.role === 'ai' && i === messages.length - 1 && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => onInsert(m.content)}><Download size={12} /> Insert</button>
                    <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => navigator.clipboard.writeText(m.content)}><Copy size={12} /> Copy</button>
                  </div>
                )}
              </div>
            ))}
            {loading && <div style={{ color: 'var(--muted)', fontSize: '13px' }}>Irus is thinking…</div>}
          </div>

          <div style={{ padding: '0 16px 10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {quickActions.map((qa) => (
              <button key={qa} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => send(qa)}>{qa}</button>
            ))}
          </div>

          <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
            <input className="input" placeholder="Ask Irus AI…" value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
            <button className="btn btn-primary" style={{ padding: '10px' }} onClick={() => send()} disabled={loading}><Send size={16} /></button>
          </div>
        </div>
      )}
    </>
  );
}