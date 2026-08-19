import { useEffect, useMemo, useState } from 'react';
import { API } from '../store/authStore';
import { Play, TerminalSquare, Loader2, ChevronDown, ChevronUp, Copy, History, Download, AlertTriangle } from 'lucide-react';

export default function RunPanel({ getCode, language, setLanguage, docId, langOptions }) {
  const [stdin, setStdin] = useState('');
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(true);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [ptab, setPtab] = useState('terminal');

  useEffect(() => {
    if (docId) API.get(`/execute/history/${docId}`).then(r => setHistory(r.data)).catch(() => {});
  }, [docId]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const problems = useMemo(() => {
    const src = (result?.run?.stderr || '') + (result?.compile?.stderr || '');
    return src.split('\n').filter(l => l.trim()).slice(0, 20);
  }, [result]);

  const run = async () => {
    setRunning(true); setResult(null);
    try {
      const { data } = await API.post('/execute', { language, code: getCode(), stdin, documentId: docId });
      setResult(data);
      if (problems.length) setPtab('problems');
      if (docId) {
        const histRes = await API.get(`/execute/history/${docId}`);
        setHistory(histRes.data);
      }
    } catch (e) {
      setResult({ run: { stdout: '', stderr: e.response?.data?.error || 'Execution failed', code: -1 }, executionTime: 0 });
    }
    setRunning(false);
  };

  const downloadCode = () => {
    const ext = { python: 'py', javascript: 'js', typescript: 'ts', 'c++': 'cpp', c: 'c', java: 'java', rust: 'rs', go: 'go', ruby: 'rb', php: 'php', kotlin: 'kt', swift: 'swift', dart: 'dart' }[language] || 'txt';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([getCode()], { type: 'text/plain' }));
    a.download = `code.${ext}`;
    a.click();
  };

  return (
    <div className="glass run-panel">
      <div className="run-head">
        <TerminalSquare size={16} style={{ color: 'var(--accent)' }} />
        <select className="tb-select" value={language} onChange={e => setLanguage(e.target.value)} title="Language (all runnable)">
          {langOptions.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <button className="btn btn-primary" style={{ padding: '6px 14px' }} onClick={run} disabled={running}>
          {running ? <Loader2 size={14} className="spin" /> : <Play size={14} />} Run
        </button>
        <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={downloadCode}><Download size={12} /> Export</button>
        {docId && <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setShowHistory(!showHistory)}><History size={12} /> History</button>}
        <div style={{ flex: 1 }} />
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>Ctrl+Enter</span>
        {result && <span style={{ color: 'var(--muted)', fontSize: 12 }}>{result.executionTime || 0}ms • exit {result.run?.code}</span>}
        {result?.run?.stdout && <button className="btn btn-ghost btn-icon" title="Copy output" onClick={() => navigator.clipboard.writeText(result.run.stdout)}><Copy size={14} /></button>}
        <button className="btn btn-ghost btn-icon" onClick={() => setOpen(!open)}>{open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</button>
      </div>
      {open && (
        <>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
            <textarea className="input" rows={2} placeholder="stdin — optional input for your program…" value={stdin} onChange={e => setStdin(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 12 }} />
          </div>
          <div style={{ display: 'flex', gap: 4, padding: '6px 10px 0', borderBottom: '1px solid var(--border)' }}>
            <button className={`ribbon-tab ${ptab === 'terminal' ? 'active' : ''}`} style={{ padding: '4px 12px' }} onClick={() => setPtab('terminal')}>TERMINAL</button>
            <button className={`ribbon-tab ${ptab === 'problems' ? 'active' : ''}`} style={{ padding: '4px 12px' }} onClick={() => setPtab('problems')}>
              PROBLEMS {problems.length > 0 && <span style={{ color: 'var(--danger)' }}>({problems.length})</span>}
            </button>
          </div>
          <div className="run-body">
            {ptab === 'terminal' && (<>
              {result?.run?.stdout && <div className="run-stdout">{result.run.stdout}</div>}
              {result?.run?.stderr && <div className="run-stderr">{result.run.stderr}</div>}
              {result?.compile?.stderr && <div className="run-stderr">Compile error: {result.compile.stderr}</div>}
              {!result && <div style={{ color: 'var(--muted)' }}>Every language in the selector runs on the Piston engine. Press Ctrl+Enter to run.</div>}
            </>)}
            {ptab === 'problems' && (<>
              {problems.length === 0 && <div style={{ color: 'var(--success)' }}>✓ No problems detected</div>}
              {problems.map((p, i) => <div key={i} className="run-stderr" style={{ display: 'flex', gap: 8 }}><AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 2 }} /> {p}</div>)}
            </>)}
          </div>
          {showHistory && history.length > 0 && (
            <div style={{ padding: '10px', borderTop: '1px solid var(--border)', maxHeight: 150, overflow: 'auto' }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Execution History</div>
              {history.map(h => (
                <div key={h.id} style={{ fontSize: 11, color: 'var(--muted)', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                  {h.language} • {h.execution_time_ms}ms • {h.error ? '✗' : '✓'} • {new Date(h.created_at).toLocaleTimeString()}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}