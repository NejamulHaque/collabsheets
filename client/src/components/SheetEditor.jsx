import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { Download, Eraser, Sigma, Trash2, Calculator, Upload } from 'lucide-react';
import PivotModal from './PivotModal';

const COLS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const ROWS = 40;

// ---------- Formula engine ----------
function rangeValues(a, b, get, visiting) {
  const parse = (ref) => ({ col: ref.replace(/\d/g, ''), row: parseInt(ref.replace(/\D/g, '')) });
  const A = parse(a), B = parse(b);
  const c1 = Math.min(A.col.charCodeAt(0), B.col.charCodeAt(0)), c2 = Math.max(A.col.charCodeAt(0), B.col.charCodeAt(0));
  const r1 = Math.min(A.row, B.row), r2 = Math.max(A.row, B.row);
  const out = [];
  for (let c = c1; c <= c2; c++) for (let r = r1; r <= r2; r++) {
    const v = parseFloat(get(String.fromCharCode(c) + r, visiting));
    if (!isNaN(v)) out.push(v);
  }
  return out;
}

function evalFormula(expr, get, visiting) {
  let e = expr.trim();
  // ✅ FIXED regex (correct capture groups)
  e = e.replace(/(SUM|AVERAGE|AVG|MIN|MAX|COUNT)\s*\(\s*([A-Z]{1,2}\d{1,4})\s*:\s*([A-Z]{1,2}\d{1,4})\s*\)/gi, (m, fn, a, b) => {
    const vals = rangeValues(a, b, get, visiting);
    const f = fn.toUpperCase();
    if (f === 'SUM') return vals.reduce((x, y) => x + y, 0);
    if (f === 'AVERAGE' || f === 'AVG') return vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : 0;
    if (f === 'MIN') return vals.length ? Math.min(...vals) : 0;
    if (f === 'MAX') return vals.length ? Math.max(...vals) : 0;
    if (f === 'COUNT') return vals.length;
    return 0;
  });
  e = e.replace(/\b[A-Z]{1,2}\d{1,4}\b/gi, (ref) => {
    const v = parseFloat(get(ref.toUpperCase(), visiting));
    return isNaN(v) ? 0 : v;
  });
  if (!/^[0-9+\-*/().,\s]*$/.test(e)) return '#ERR!';
  try {
    const result = Function(`"use strict"; return (${e});`)();
    return typeof result === 'number' && isFinite(result) ? Math.round(result * 10000) / 10000 : '#ERR!';
  } catch { return '#ERR!'; }
}

const makeGet = (cells) => (key, visiting = new Set()) => {
  if (visiting.has(key)) return '#CYCLE!';
  const raw = cells.get(key) || '';
  if (raw.startsWith('=')) {
    visiting.add(key);
    const r = evalFormula(raw.slice(1), makeGet(cells), visiting);
    visiting.delete(key);
    return String(r);
  }
  return raw;
};

// ---------- Chart helpers ----------
const parseRange = (range) => {
  const [a, b] = String(range).toUpperCase().split(':');
  const pc = (s) => ({ col: s.replace(/\d/g, '') || 'A', row: parseInt(s.replace(/\D/g, '')) || 1 });
  const A = pc(a), B = pc(b || a);
  return { c1: A.col.charCodeAt(0), c2: B.col.charCodeAt(0), r1: Math.min(A.row, B.row), r2: Math.max(A.row, B.row) };
};

const BarChart = ({ labels, values }) => {
  const max = Math.max(...values, 1);
  return (
    <svg viewBox="0 0 300 160" style={{ width: '100%' }}>
      {values.map((v, i) => {
        const h = (v / max) * 115; const x = 20 + i * (260 / Math.max(1, values.length));
        return (<g key={i}><rect x={x} y={140 - h} width={18} height={h} rx={3} fill="#7c5cff" /><text x={x} y={152} fontSize={8} fill="#888">{String(labels[i] ?? '').slice(0, 6)}</text></g>);
      })}
    </svg>
  );
};

const LineChart = ({ values }) => {
  const max = Math.max(...values, 1);
  const step = 260 / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => `${20 + i * step},${140 - (v / max) * 115}`).join(' ');
  return (
    <svg viewBox="0 0 300 160" style={{ width: '100%' }}>
      <polyline points={pts} fill="none" stroke="#22d3ee" strokeWidth={2.5} />
      {values.map((v, i) => <circle key={i} cx={20 + i * step} cy={140 - (v / max) * 115} r={3.5} fill="#22d3ee" />)}
    </svg>
  );
};

const PieChart = ({ values }) => {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const cols = ['#7c5cff', '#22d3ee', '#f59e0b', '#ef4444', '#10b981', '#ec4899'];
  let a = -Math.PI / 2;
  return (
    <svg viewBox="0 0 160 160" style={{ width: '70%', margin: '0 auto', display: 'block' }}>
      {values.map((v, i) => {
        const a2 = a + (v / total) * 2 * Math.PI;
        const d = `M80 80 L${80 + 70 * Math.cos(a)} ${80 + 70 * Math.sin(a)} A70 70 0 ${a2 - a > Math.PI ? 1 : 0} 1 ${80 + 70 * Math.cos(a2)} ${80 + 70 * Math.sin(a2)} Z`;
        a = a2;
        return <path key={i} d={d} fill={cols[i % 6]} />;
      })}
    </svg>
  );
};

export default function SheetEditor({ ydoc, readOnly }) {
  const cells = ydoc.getMap('cells');
  const [, bump] = useState(0);
  const [selected, setSelected] = useState('A1');
  const [focused, setFocused] = useState(null);
  const [tab, setTab] = useState('Home');
  const [showPivot, setShowPivot] = useState(false);

  useEffect(() => {
    const obs = () => bump(x => x + 1);
    cells.observe(obs);
    return () => cells.unobserve(obs);
  }, [cells]);

  const get = makeGet(cells);
  const setCell = (key, val) => { if (!readOnly) ydoc.transact(() => cells.set(key, val)); };
  const selCol = selected.replace(/\d/g, '') || 'A';
  const selRow = parseInt(selected.replace(/\D/g, '')) || 1;

  const exportCSV = () => {
    let csv = '';
    for (let r = 1; r <= ROWS; r++) {
      csv += COLS.map(c => {
        const v = get(c + r);
        return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(',') + '\n';
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'sheet.csv';
    a.click();
  };

  const importCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result).split(/\r?\n/).slice(0, ROWS);
      ydoc.transact(() => lines.forEach((line, ri) => {
        line.split(',').slice(0, COLS.length).forEach((val, ci) => {
          cells.set(COLS[ci] + (ri + 1), val.replace(/^"|"$/g, '').trim());
        });
      }));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const sortCol = (dir) => {
    const vals = [];
    for (let r = 1; r <= ROWS; r++) { const v = cells.get(selCol + r); if (v) vals.push(v); }
    vals.sort((a, b) => {
      const na = parseFloat(a), nb = parseFloat(b);
      if (!isNaN(na) && !isNaN(nb)) return dir === 'asc' ? na - nb : nb - na;
      return dir === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
    });
    ydoc.transact(() => { for (let r = 1; r <= ROWS; r++) cells.set(selCol + r, vals[r - 1] || ''); });
  };

  const insertFn = (fn) => setCell(selected, `=${fn}(${selCol}1:${selCol}${ROWS})`);

  const charts = ydoc.getArray('charts');
  const addChart = (type) => {
    const range = prompt('Chart range (labels + values), e.g. A1:B6:', 'A1:B5');
    if (!range) return;
    const m = new Y.Map();
    m.set('type', type); m.set('range', range);
    ydoc.transact(() => charts.push([m]));
  };

  const chartData = (range) => {
    const { c1, c2, r1, r2 } = parseRange(range);
    const single = c2 === c1;
    const labels = [], values = [];
    for (let r = r1; r <= r2; r++) {
      labels.push(single ? String(r) : (get(String.fromCharCode(c1) + r) || String(r)));
      values.push(parseFloat(get(String.fromCharCode(single ? c1 : c2) + r)) || 0);
    }
    return { labels, values };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      <div className="glass ribbon">
        <div className="ribbon-tabs">
          {['Home', 'Formulas', 'Data', 'Charts', 'View'].map(t => (
            <button key={t} className={`ribbon-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ color: 'var(--muted)', fontSize: 12, paddingBottom: 6 }}>{readOnly ? '👁 View only' : 'Realtime Grid — syncs live'}</span>
        </div>
        <div className="ribbon-body">
          {tab === 'Home' && (<>
            <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => setCell(selected, '')}><Eraser size={14} /> Clear Cell</button>
            <button className="btn btn-danger" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => { if (confirm('Clear entire sheet?')) ydoc.transact(() => cells.clear()); }}><Trash2 size={14} /> Clear All</button>
          </>)}

          {tab === 'Formulas' && (<>
            <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => insertFn('SUM')}><Sigma size={14} /> AutoSum</button>
            <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => insertFn('AVERAGE')}><Calculator size={14} /> AVERAGE</button>
            <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => insertFn('MAX')}>MAX</button>
            <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => insertFn('MIN')}>MIN</button>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Tip: type <b>=A1+B2*3</b> in any cell</span>
          </>)}

          {tab === 'Data' && (<>
            <label className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13, cursor: 'pointer' }}>
              <Upload size={14} /> Import CSV
              <input type="file" hidden accept=".csv" onChange={importCSV} />
            </label>
            <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={exportCSV}><Download size={14} /> Export CSV</button>
            <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => sortCol('asc')}>Sort {selCol} ↑</button>
            <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => sortCol('desc')}>Sort {selCol} ↓</button>
            <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => setShowPivot(true)}>🎨 Pivot Table</button>
          </>)}

          {tab === 'Charts' && (<>
            <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => addChart('bar')}>📊 Bar</button>
            <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => addChart('line')}>📈 Line</button>
            <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => addChart('pie')}>🥧 Pie</button>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Col A = labels, Col B = values</span>
          </>)}

          {tab === 'View' && (<>
            <button className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={exportCSV}><Download size={14} /> Export CSV</button>
          </>)}
        </div>
      </div>

      <div className="glass fx-bar">
        <div className="fx-name">{selected}</div>
        <span className="fx-label">fx</span>
        <input className="fx-input" disabled={readOnly} value={cells.get(selected) || ''} onChange={e => setCell(selected, e.target.value)} placeholder="Type a value or formula like =SUM(A1:A5)" />
      </div>

      <div className="sheet-wrap">
        <table className="sheet-table">
          <thead>
            <tr>
              <th className="sheet-corner"></th>
              {COLS.map(c => <th key={c} className={selCol === c ? 'col-active' : ''}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }, (_, i) => i + 1).map(r => (
              <tr key={r}>
                <th className={`row-head ${selRow === r ? 'row-active' : ''}`}>{r}</th>
                {COLS.map(c => {
                  const key = c + r;
                  const raw = cells.get(key) || '';
                  const display = raw.startsWith('=') ? get(key) : raw;
                  return (
                    <td key={key} className={selected === key ? 'cell-active' : ''}>
                      <input
                        className="sheet-cell"
                        disabled={readOnly}
                        value={focused === key ? raw : display}
                        onFocus={() => { setFocused(key); setSelected(key); }}
                        onBlur={() => setFocused(null)}
                        onChange={e => setCell(key, e.target.value)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {charts.length > 0 && (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {Array.from(charts).map((ch, i) => {
            const d = chartData(ch.get('range'));
            return (
              <div key={i} className="glass chart-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  {String(ch.get('type')).toUpperCase()} • {ch.get('range')}
                  {!readOnly && <button className="btn btn-ghost btn-icon" onClick={() => ydoc.transact(() => charts.delete(i, 1))}><Trash2 size={12} /></button>}
                </div>
                {ch.get('type') === 'bar' ? <BarChart {...d} /> : ch.get('type') === 'line' ? <LineChart values={d.values} /> : <PieChart {...d} />}
              </div>
            );
          })}
        </div>
      )}

      {showPivot && (
        <PivotModal
          getRange={(range) => {
            const { c1, c2, r1, r2 } = parseRange(range);
            const labels = [], matrix = [];
            for (let r = r1 + 1; r <= r2; r++) { labels.push(get(String.fromCharCode(c1) + r)); matrix.push(get(String.fromCharCode(c2) + r)); }
            return { labels, matrix };
          }}
          onClose={() => setShowPivot(false)}
        />
      )}
    </div>
  );
}