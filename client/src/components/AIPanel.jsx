import { useState } from 'react';
import { Sparkles, X, Send, Copy, Download, Bot, Wand2, Lightbulb, Check } from 'lucide-react';
import { API } from '../store/authStore';

export default function AIPanel({ getContext, onInsert, mode = 'code' }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [insertedIdx, setInsertedIdx] = useState(null);

  const getQuickActions = () => {
    if (mode === 'code') {
      return [
        { label: 'Explain this code', prompt: 'Explain what this code does in clear, bulleted steps.' },
        { label: 'Refactor & Clean', prompt: 'Refactor this code to follow best practices, clean design, and optimal performance.' },
        { label: 'Generate Unit Tests', prompt: 'Write comprehensive unit tests with edge cases for this code.' },
        { label: 'Find Bugs & Security', prompt: 'Identify any potential bugs, edge cases, or security risks in this code.' },
        { label: 'Add Documentation', prompt: 'Add clean docstrings and comments explaining this code.' },
      ];
    }
    if (mode === 'richtext') {
      return [
        { label: 'Draft Intro & Outline', prompt: 'Draft a professional introduction and structured outline for this topic.' },
        { label: 'Rewrite Professionally', prompt: 'Rewrite the following text with an executive, professional tone.' },
        { label: 'Summarize Key Takeaways', prompt: 'Provide a concise summary with top 3 key takeaways.' },
        { label: 'Polish Grammar & Style', prompt: 'Fix grammar, punctuation, and flow for maximum clarity.' },
      ];
    }
    if (mode === 'sheets') {
      return [
        { label: 'Create Formula', prompt: 'Write an Excel formula to calculate total sum where condition is met.' },
        { label: 'Analyze Spreadsheet Data', prompt: 'Analyze this spreadsheet data and identify key trends and metrics.' },
        { label: 'Generate Sample Sales Data', prompt: 'Generate 5 rows of sample quarterly sales data with Region, Units, Revenue.' },
      ];
    }
    if (mode === 'slides') {
      return [
        { label: 'Generate 5-Slide Deck', prompt: 'Create a 5-slide presentation deck structure with titles and 3 bullet points each.' },
        { label: 'Draft Speaker Notes', prompt: 'Write engaging speaker notes for the current slide talking points.' },
        { label: 'Turn into Pitch Deck', prompt: 'Structure this topic into a concise startup investor pitch deck.' },
      ];
    }
    return [
      { label: 'Explain this', prompt: 'Explain the current content.' },
      { label: 'Summarize', prompt: 'Summarize this content.' },
    ];
  };

  const quickActions = getQuickActions();

  const send = async (customPrompt) => {
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt.trim() || loading) return;

    setPrompt('');
    setMessages(m => [...m, { role: 'user', content: finalPrompt }]);
    setLoading(true);

    try {
      const context = getContext ? getContext() : '';
      const { data } = await API.post('/ai/generate', {
        prompt: finalPrompt,
        context,
      });

      const reply = data?.response || data?.answer || data?.message || 'Irus AI response received.';
      setMessages(m => [...m, { role: 'ai', content: reply }]);
    } catch (err) {
      setMessages(m => [
        ...m,
        {
          role: 'ai',
          content: `⚠️ Could not reach Irus AI backend. Running in local fallback mode:\n\n` +
            `Here is a suggested solution for "${finalPrompt}":\n` +
            `- Ensure all parameters and imports are defined.\n- Check logic flow and edge cases.\n- For documents and slides, structure content with clear headings.`,
        },
      ]);
    }
    setLoading(false);
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleInsert = (text, idx) => {
    if (onInsert) {
      onInsert(text);
      setInsertedIdx(idx);
      setTimeout(() => setInsertedIdx(null), 2000);
    }
  };

  return (
    <>
      {/* Floating AI Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="ai-fab btn btn-primary"
        title="Irus AI Copilot"
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 30px rgba(124, 92, 255, 0.45)',
        }}
      >
        {open ? <X size={20} /> : <Sparkles size={20} />}
      </button>

      {/* Irus AI Chat Modal / Drawer */}
      {open && (
        <div className="glass irus-copilot-window">
          {/* Header */}
          <div className="copilot-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="copilot-bot-badge">
                <Bot size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Irus AI Copilot</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {mode === 'code' ? '💻 Coding Assistant' : mode === 'richtext' ? '📄 Word Writing Assistant' : mode === 'sheets' ? '📊 Formula & Data Assistant' : '📽 Presentation Generator'}
                </div>
              </div>
            </div>
            <button className="vscode-icon-btn" onClick={() => setOpen(false)}><X size={15} /></button>
          </div>

          {/* Messages */}
          <div className="copilot-messages">
            {messages.length === 0 && (
              <div className="copilot-welcome">
                <Wand2 size={28} style={{ color: 'var(--accent)', margin: '0 auto 10px' }} />
                <div style={{ fontWeight: 700, fontSize: 14 }}>How can I help you today?</div>
                <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>
                  Ask questions, generate code, write documents, or tap one of the smart actions below!
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`copilot-bubble ${m.role === 'user' ? 'user' : 'ai'}`}
              >
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.content}</div>
                {m.role === 'ai' && (
                  <div className="bubble-actions" style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '4px 10px', fontSize: 11, background: insertedIdx === i ? 'rgba(16, 185, 129, 0.2)' : undefined, color: insertedIdx === i ? '#10b981' : undefined }}
                      onClick={() => handleInsert(m.content, i)}
                    >
                      {insertedIdx === i ? <Check size={11} /> : <Download size={11} />}
                      <span>{insertedIdx === i ? 'Inserted! ✓' : 'Insert into Doc'}</span>
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '4px 10px', fontSize: 11, background: copiedIdx === i ? 'rgba(16, 185, 129, 0.2)' : undefined, color: copiedIdx === i ? '#10b981' : undefined }}
                      onClick={() => handleCopy(m.content, i)}
                    >
                      {copiedIdx === i ? <Check size={11} /> : <Copy size={11} />}
                      <span>{copiedIdx === i ? 'Copied! ✓' : 'Copy'}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="copilot-bubble ai" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                Irus AI is thinking & crafting your response…
              </div>
            )}
          </div>

          {/* Smart Quick Actions */}
          <div className="copilot-quick-actions">
            {quickActions.map((qa, i) => (
              <button
                key={i}
                className="btn btn-ghost quick-chip"
                onClick={() => send(qa.prompt)}
              >
                <Lightbulb size={11} style={{ color: 'var(--accent)' }} />
                <span>{qa.label}</span>
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="copilot-input-area">
            <input
              className="vscode-input"
              placeholder={`Ask Irus AI about ${mode}...`}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
            />
            <button
              className="btn btn-primary"
              style={{ padding: '8px 12px' }}
              onClick={() => send()}
              disabled={loading || !prompt.trim()}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}