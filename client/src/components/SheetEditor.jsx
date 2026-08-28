import { useEffect, useState, useMemo, useRef } from 'react';
import * as Y from 'yjs';
import {
  Download, Eraser, Sigma, Trash2, Calculator, Upload,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Palette, Type, Plus, ChevronDown, Check, X,
  PieChart as PieIcon, BarChart2, TrendingUp, Grid, Table as TIcon,
  HelpCircle, Eye, EyeOff, Sparkles, Filter, ArrowUpDown, FileSpreadsheet,
  Search, ZoomIn, ZoomOut, Maximize2, RotateCcw,
} from 'lucide-react';
export function numToCol(num) {
  let s = '';
  let n = num;
  while (n > 0) {
    const mod = (n - 1) % 26;
    s = String.fromCharCode(65 + mod) + s;
    n = Math.floor((n - mod) / 26);
  }
  return s;
}

export function colToNum(colStr) {
  let num = 0;
  for (let i = 0; i < colStr.length; i++) {
    num = num * 26 + (colStr.charCodeAt(i) - 64);
  }
  return num;
}

export function generateCols(count = 100) {
  const cols = [];
  for (let i = 1; i <= count; i++) {
    cols.push(numToCol(i));
  }
  return cols;
}

const DEFAULT_COLS = generateCols(100);
const DEFAULT_ROWS_COUNT = 150;

// ---------- Advanced Formula Engine ----------
function parseCellRef(ref) {
  const col = ref.replace(/\d/g, '').toUpperCase();
  const row = parseInt(ref.replace(/\D/g, '')) || 1;
  return { col, row, colNum: colToNum(col) };
}

function getRangeCoordinates(a, b) {
  const A = parseCellRef(a);
  const B = parseCellRef(b || a);
  const c1 = Math.min(A.colNum, B.colNum);
  const c2 = Math.max(A.colNum, B.colNum);
  const r1 = Math.min(A.row, B.row);
  const r2 = Math.max(A.row, B.row);
  return { c1, c2, r1, r2 };
}

function getRangeValues(a, b, getFn, visiting) {
  const { c1, c2, r1, r2 } = getRangeCoordinates(a, b);
  const vals = [];
  for (let c = c1; c <= c2; c++) {
    const colStr = numToCol(c);
    for (let r = r1; r <= r2; r++) {
      const cellKey = colStr + r;
      const rawVal = getFn(cellKey, visiting);
      const num = parseFloat(rawVal);
      if (!isNaN(num)) vals.push(num);
      else if (rawVal) vals.push(rawVal);
    }
  }
  return vals;
}

function getRangeNumbers(a, b, getFn, visiting) {
  const vals = getRangeValues(a, b, getFn, visiting);
  return vals.filter(v => typeof v === 'number' && !isNaN(v));
}

function evaluateFormula(expr, getFn, visiting = new Set()) {
  let e = expr.trim();
  if (e.startsWith('=')) e = e.slice(1).trim();

  // 1. Math / Stats functions
  e = e.replace(/(SUM|AVERAGE|AVG|MIN|MAX|COUNT|COUNTA|PRODUCT)\s*\(\s*([A-Z]{1,2}\d{1,4})\s*:\s*([A-Z]{1,2}\d{1,4})\s*\)/gi, (m, fn, a, b) => {
    const nums = getRangeNumbers(a, b, getFn, visiting);
    const all = getRangeValues(a, b, getFn, visiting);
    const f = fn.toUpperCase();
    if (f === 'SUM') return nums.reduce((x, y) => x + y, 0);
    if (f === 'AVERAGE' || f === 'AVG') return nums.length ? nums.reduce((x, y) => x + y, 0) / nums.length : 0;
    if (f === 'MIN') return nums.length ? Math.min(...nums) : 0;
    if (f === 'MAX') return nums.length ? Math.max(...nums) : 0;
    if (f === 'COUNT') return nums.length;
    if (f === 'COUNTA') return all.length;
    if (f === 'PRODUCT') return nums.length ? nums.reduce((x, y) => x * y, 1) : 0;
    return 0;
  });

  // 2. Logic / String functions
  e = e.replace(/IF\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/gi, (m, cond, ifTrue, ifFalse) => {
    try {
      const evalCond = evaluateFormula(cond, getFn, visiting);
      return evalCond ? evaluateFormula(ifTrue, getFn, visiting) : evaluateFormula(ifFalse, getFn, visiting);
    } catch { return ifFalse; }
  });

  e = e.replace(/UPPER\s*\(\s*([^)]+)\s*\)/gi, (m, arg) => String(evaluateFormula(arg, getFn, visiting)).toUpperCase());
  e = e.replace(/LOWER\s*\(\s*([^)]+)\s*\)/gi, (m, arg) => String(evaluateFormula(arg, getFn, visiting)).toLowerCase());
  e = e.replace(/LEN\s*\(\s*([^)]+)\s*\)/gi, (m, arg) => String(evaluateFormula(arg, getFn, visiting)).length);
  e = e.replace(/SQRT\s*\(\s*([^)]+)\s*\)/gi, (m, arg) => Math.sqrt(parseFloat(evaluateFormula(arg, getFn, visiting)) || 0));
  e = e.replace(/ROUND\s*\(\s*([^,]+)\s*(?:,\s*(\d+))?\s*\)/gi, (m, arg, dec) => {
    const num = parseFloat(evaluateFormula(arg, getFn, visiting)) || 0;
    const d = parseInt(dec || '0');
    return num.toFixed(d);
  });

  // 3. Replace single cell coordinates with their numerical or string values
  e = e.replace(/\b([A-Z]{1,2}\d{1,4})\b/gi, (match) => {
    const v = getFn(match.toUpperCase(), visiting);
    const num = parseFloat(v);
    return isNaN(num) ? `"${v}"` : num;
  });

  // 4. Safe arithmetic evaluation
  if (!/^[0-9+\-*/().,\s<>=!&"']*$/.test(e)) return '#ERR!';
  try {
    const result = Function(`"use strict"; return (${e});`)();
    if (typeof result === 'number' && isFinite(result)) {
      return Math.round(result * 100000) / 100000;
    }
    return result !== undefined ? String(result) : '#ERR!';
  } catch {
    return '#ERR!';
  }
}

const createGetCell = (cellsMap) => (key, visiting = new Set()) => {
  if (visiting.has(key)) return '#CYCLE!';
  const raw = cellsMap.get(key) || '';
  if (typeof raw === 'string' && raw.startsWith('=')) {
    visiting.add(key);
    const r = evaluateFormula(raw.slice(1), createGetCell(cellsMap), visiting);
    visiting.delete(key);
    return String(r);
  }
  return String(raw);
};

// ---------- Chart Components ----------
const BarChart = ({ labels, values }) => {
  const max = Math.max(...values, 1);
  return (
    <svg viewBox="0 0 320 170" style={{ width: '100%' }}>
      {values.map((v, i) => {
        const h = Math.max(4, (v / max) * 120);
        const x = 20 + i * (280 / Math.max(1, values.length));
        return (
          <g key={i}>
            <rect x={x} y={145 - h} width={20} height={h} rx={4} fill="#107c41" />
            <text x={x + 10} y={160} fontSize={9} textAnchor="middle" fill="#888">
              {String(labels[i] ?? '').slice(0, 6)}
            </text>
            <text x={x + 10} y={140 - h} fontSize={8} textAnchor="middle" fill="#107c41" fontWeight="bold">
              {v}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const LineChart = ({ labels, values }) => {
  const max = Math.max(...values, 1);
  const step = 280 / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => `${20 + i * step},${145 - (v / max) * 120}`).join(' ');
  return (
    <svg viewBox="0 0 320 170" style={{ width: '100%' }}>
      <polyline points={pts} fill="none" stroke="#22d3ee" strokeWidth={3} />
      {values.map((v, i) => (
        <g key={i}>
          <circle cx={20 + i * step} cy={145 - (v / max) * 120} r={4} fill="#22d3ee" />
          <text x={20 + i * step} y={160} fontSize={9} textAnchor="middle" fill="#888">
            {String(labels[i] ?? '').slice(0, 5)}
          </text>
        </g>
      ))}
    </svg>
  );
};

const PieChart = ({ values }) => {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const cols = ['#107c41', '#22d3ee', '#f59e0b', '#ef4444', '#7c5cff', '#ec4899'];
  let a = -Math.PI / 2;
  return (
    <svg viewBox="0 0 180 180" style={{ width: '65%', margin: '0 auto', display: 'block' }}>
      {values.map((v, i) => {
        const a2 = a + (v / total) * 2 * Math.PI;
        const d = `M90 90 L${90 + 75 * Math.cos(a)} ${90 + 75 * Math.sin(a)} A75 75 0 ${a2 - a > Math.PI ? 1 : 0} 1 ${90 + 75 * Math.cos(a2)} ${90 + 75 * Math.sin(a2)} Z`;
        a = a2;
        return <path key={i} d={d} fill={cols[i % cols.length]} stroke="#fff" strokeWidth={1.5} />;
      })}
    </svg>
  );
};

export default function SheetEditor({ ydoc, readOnly }) {
  const cells = ydoc.getMap('cells');
  const formats = ydoc.getMap('cellFormats'); // formatting metadata: bold, italic, color, bg, align
  const sheetsArray = ydoc.getArray('sheetsList');
  const charts = ydoc.getArray('charts');

  const [, bump] = useState(0);
  const [selected, setSelected] = useState('A1');
  const [selectionRange, setSelectionRange] = useState({ start: 'A1', end: 'A1' });
  const [isSelecting, setIsSelecting] = useState(false);
  const [focused, setFocused] = useState(null);
  const [tab, setTab] = useState('Home');
  const [showPivot, setShowPivot] = useState(false);
  const [showFxModal, setShowFxModal] = useState(false);
  const [activeSheet, setActiveSheet] = useState('Sheet1');
  const [zoom, setZoom] = useState(100);
  const [colCount, setColCount] = useState(100);
  const [rowCount, setRowCount] = useState(150);

  const COLS = useMemo(() => generateCols(colCount), [colCount]);

  // Initialize defaults
  useEffect(() => {
    const obs = () => bump(x => x + 1);
    cells.observe(obs);
    formats.observe(obs);
    if (sheetsArray.length === 0 && !readOnly) {
      ydoc.transact(() => sheetsArray.push(['Sheet1']));
    }
    return () => {
      cells.unobserve(obs);
      formats.unobserve(obs);
    };
  }, [cells, formats, sheetsArray, ydoc, readOnly]);

  const get = useMemo(() => createGetCell(cells), [cells]);

  const setCell = (key, val) => {
    if (!readOnly) ydoc.transact(() => cells.set(key, val));
  };

  const getFormat = (key) => formats.get(key) || {};

  const updateFormat = (key, stylePatch) => {
    if (readOnly) return;
    const current = formats.get(key) || {};
    ydoc.transact(() => formats.set(key, { ...current, ...stylePatch }));
  };

  const selCol = selected.replace(/\d/g, '') || 'A';
  const selRow = parseInt(selected.replace(/\D/g, '')) || 1;

  // Selected Range Aggregations
  const rangeStats = useMemo(() => {
    const { c1, c2, r1, r2 } = getRangeCoordinates(selectionRange.start, selectionRange.end);
    const nums = [];
    let totalCount = 0;
    for (let c = c1; c <= c2; c++) {
      for (let r = r1; r <= r2; r++) {
        const val = get(String.fromCharCode(c) + r);
        if (val !== '') totalCount++;
        const num = parseFloat(val);
        if (!isNaN(num)) nums.push(num);
      }
    }
    const sum = nums.reduce((a, b) => a + b, 0);
    const avg = nums.length ? (sum / nums.length).toFixed(2) : 0;
    const min = nums.length ? Math.min(...nums) : 0;
    const max = nums.length ? Math.max(...nums) : 0;
    return { count: totalCount, numCount: nums.length, sum, avg, min, max };
  }, [selectionRange, get]);

  // CSV Import/Export
  const exportCSV = () => {
    let csv = '';
    for (let r = 1; r <= rowCount; r++) {
      csv += COLS.map(c => {
        const v = get(c + r);
        return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(',') + '\n';
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${activeSheet || 'sheet'}.csv`;
    a.click();
  };

  const importCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result).split(/\r?\n/).slice(0, rowCount);
      ydoc.transact(() => {
        lines.forEach((line, ri) => {
          line.split(',').slice(0, COLS.length).forEach((val, ci) => {
            cells.set(COLS[ci] + (ri + 1), val.replace(/^"|"$/g, '').trim());
          });
        });
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Sort Column
  const sortCol = (dir) => {
    const vals = [];
    for (let r = 1; r <= rowCount; r++) {
      const v = cells.get(selCol + r);
      if (v !== undefined) vals.push(v);
    }
    vals.sort((a, b) => {
      const na = parseFloat(a), nb = parseFloat(b);
      if (!isNaN(na) && !isNaN(nb)) return dir === 'asc' ? na - nb : nb - na;
      return dir === 'asc' ? String(a).localeCompare(String(b)) : String(b).localeCompare(String(a));
    });
    ydoc.transact(() => {
      for (let r = 1; r <= rowCount; r++) {
        cells.set(selCol + r, vals[r - 1] || '');
      }
    });
  };

  const insertFn = (fn) => setCell(selected, `=${fn}(${selCol}1:${selCol}${selRow > 1 ? selRow - 1 : 10})`);

  // Chart Helpers
  const addChart = (type) => {
    const range = prompt('Enter data range (e.g. A1:B6):', `${selectionRange.start}:${selectionRange.end}`);
    if (!range) return;
    const m = new Y.Map();
    m.set('type', type);
    m.set('range', range);
    ydoc.transact(() => charts.push([m]));
  };

  const chartData = (range) => {
    const { c1, c2, r1, r2 } = getRangeCoordinates(...range.split(':'));
    const single = c2 === c1;
    const labels = [], values = [];
    for (let r = r1; r <= r2; r++) {
      labels.push(single ? String(r) : (get(String.fromCharCode(c1) + r) || String(r)));
      values.push(parseFloat(get(String.fromCharCode(single ? c1 : c2) + r)) || 0);
    }
    return { labels, values };
  };

  const activeFormat = getFormat(selected);

  return (
    <div className="excel-suite-wrapper">
      {/* 1️⃣ EXCEL 365 RIBBON */}
      <div className="excel-ribbon-container">
        <div className="excel-ribbon-tabs">
          <div className="excel-brand-badge">
            <FileSpreadsheet size={18} />
            <span>Excel</span>
          </div>
          {['File', 'Home', 'Insert', 'Page Layout', 'Formulas', 'Data', 'Review', 'View'].map(t => (
            <button
              key={t}
              className={`excel-ribbon-tab ${tab === t ? 'active' : ''} ${t === 'File' ? 'tab-file' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--muted)', paddingRight: 10 }}>
            {readOnly ? '👁 View Only' : 'AutoSave: On • Live Sync'}
          </span>
        </div>

        <div className="excel-ribbon-body">
          {/* HOME TAB */}
          {tab === 'Home' && (
            <>
              {/* Clipboard & Format */}
              <div className="ribbon-chunk">
                <div style={{ display: 'flex', gap: 2 }}>
                  <button
                    className={`word-tb-btn ${activeFormat.bold ? 'active' : ''}`}
                    title="Bold"
                    onClick={() => updateFormat(selected, { bold: !activeFormat.bold })}
                  >
                    <Bold size={14} />
                  </button>
                  <button
                    className={`word-tb-btn ${activeFormat.italic ? 'active' : ''}`}
                    title="Italic"
                    onClick={() => updateFormat(selected, { italic: !activeFormat.italic })}
                  >
                    <Italic size={14} />
                  </button>
                  <button
                    className={`word-tb-btn ${activeFormat.underline ? 'active' : ''}`}
                    title="Underline"
                    onClick={() => updateFormat(selected, { underline: !activeFormat.underline })}
                  >
                    <Underline size={14} />
                  </button>
                  <label className="word-color-picker" title="Cell Background Color">
                    <input
                      type="color"
                      onChange={e => updateFormat(selected, { bg: e.target.value })}
                    />
                    <Palette size={14} />
                  </label>
                  <label className="word-color-picker" title="Text Color">
                    <input
                      type="color"
                      onChange={e => updateFormat(selected, { color: e.target.value })}
                    />
                    <Type size={14} />
                  </label>
                </div>
                <span className="chunk-label">Font</span>
              </div>
              <span className="word-tb-sep" />

              {/* Alignment */}
              <div className="ribbon-chunk">
                <div style={{ display: 'flex', gap: 2 }}>
                  <button
                    className={`word-tb-btn ${activeFormat.align === 'left' ? 'active' : ''}`}
                    title="Align Left"
                    onClick={() => updateFormat(selected, { align: 'left' })}
                  >
                    <AlignLeft size={14} />
                  </button>
                  <button
                    className={`word-tb-btn ${activeFormat.align === 'center' ? 'active' : ''}`}
                    title="Align Center"
                    onClick={() => updateFormat(selected, { align: 'center' })}
                  >
                    <AlignCenter size={14} />
                  </button>
                  <button
                    className={`word-tb-btn ${activeFormat.align === 'right' ? 'active' : ''}`}
                    title="Align Right"
                    onClick={() => updateFormat(selected, { align: 'right' })}
                  >
                    <AlignRight size={14} />
                  </button>
                </div>
                <span className="chunk-label">Alignment</span>
              </div>
              <span className="word-tb-sep" />

              {/* Number Format */}
              <div className="ribbon-chunk">
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <select
                    className="word-select"
                    style={{ width: 96 }}
                    value={activeFormat.numFormat || 'General'}
                    onChange={e => updateFormat(selected, { numFormat: e.target.value })}
                  >
                    <option value="General">General</option>
                    <option value="Currency">Currency ($)</option>
                    <option value="Percent">Percent (%)</option>
                    <option value="Number">Decimal (.00)</option>
                  </select>
                </div>
                <span className="chunk-label">Number</span>
              </div>
              <span className="word-tb-sep" />

              {/* Editing & AutoSum */}
              <div className="ribbon-chunk">
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => insertFn('SUM')}>
                    <Sigma size={13} /> AutoSum
                  </button>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => insertFn('AVERAGE')}>
                    <Calculator size={13} /> Average
                  </button>
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => setCell(selected, '')}>
                    <Eraser size={13} /> Clear
                  </button>
                  <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => { if (confirm('Clear sheet?')) ydoc.transact(() => cells.clear()); }}>
                    <Trash2 size={13} /> Reset
                  </button>
                </div>
                <span className="chunk-label">Editing</span>
              </div>
            </>
          )}

          {/* INSERT TAB */}
          {tab === 'Insert' && (
            <div className="ribbon-group-row">
              <button className="word-btn-tool" onClick={() => addChart('bar')}>
                <BarChart2 size={16} />
                <span>Bar Chart</span>
              </button>
              <button className="word-btn-tool" onClick={() => addChart('line')}>
                <TrendingUp size={16} />
                <span>Line Chart</span>
              </button>
              <button className="word-btn-tool" onClick={() => addChart('pie')}>
                <PieIcon size={16} />
                <span>Pie Chart</span>
              </button>
              <span className="word-tb-sep" />
              <button className="word-btn-tool" onClick={() => setShowPivot(true)}>
                <Grid size={16} />
                <span>PivotTable</span>
              </button>
            </div>
          )}

          {/* FORMULAS TAB */}
          {tab === 'Formulas' && (
            <div className="ribbon-group-row">
              <button className="word-btn-tool" onClick={() => setShowFxModal(true)}>
                <Calculator size={16} />
                <span>Insert Function fx</span>
              </button>
              <span className="word-tb-sep" />
              <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => insertFn('SUM')}>SUM</button>
              <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => insertFn('AVERAGE')}>AVERAGE</button>
              <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => insertFn('COUNT')}>COUNT</button>
              <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => insertFn('MAX')}>MAX</button>
              <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => insertFn('MIN')}>MIN</button>
              <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => setCell(selected, '=IF(A1>100, "High", "Low")')}>IF</button>
            </div>
          )}

          {/* DATA TAB */}
          {tab === 'Data' && (
            <div className="ribbon-group-row">
              <label className="word-btn-tool" style={{ cursor: 'pointer' }}>
                <Upload size={16} />
                <span>Import CSV</span>
                <input type="file" hidden accept=".csv" onChange={importCSV} />
              </label>
              <button className="word-btn-tool" onClick={exportCSV}>
                <Download size={16} />
                <span>Export CSV</span>
              </button>
              <span className="word-tb-sep" />
              <button className="word-btn-tool" onClick={() => sortCol('asc')}>
                <ArrowUpDown size={16} />
                <span>Sort {selCol} Asc (A-Z)</span>
              </button>
              <button className="word-btn-tool" onClick={() => sortCol('desc')}>
                <ArrowUpDown size={16} />
                <span>Sort {selCol} Desc (Z-A)</span>
              </button>
            </div>
          )}

          {/* FILE TAB */}
          {tab === 'File' && (
            <div className="ribbon-group-row">
              <button className="word-action-card" onClick={exportCSV}>
                <Download size={18} />
                <span>Download .csv</span>
              </button>
              <button className="word-action-card" onClick={() => window.print()}>
                <TIcon size={18} />
                <span>Print Sheet</span>
              </button>
            </div>
          )}

          {/* VIEW TAB */}
          {tab === 'View' && (
            <div className="ribbon-group-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ZoomIn size={16} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Grid Zoom:</span>
                <select className="word-select" value={zoom} onChange={e => setZoom(+e.target.value)}>
                  {[75, 90, 100, 110, 125, 150].map(z => <option key={z} value={z}>{z}%</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2️⃣ EXCEL FORMULA BAR */}
      <div className="excel-fx-bar">
        <div className="fx-name-box" title="Cell Reference">{selected}</div>
        <div className="fx-actions">
          <button className="fx-action-btn" title="Cancel" onClick={() => setFocused(null)}><X size={13} /></button>
          <button className="fx-action-btn" title="Enter" onClick={() => setFocused(null)}><Check size={13} /></button>
        </div>
        <span className="fx-icon-label" title="Insert Function" onClick={() => setShowFxModal(true)}>fx</span>
        <input
          className="excel-fx-input"
          disabled={readOnly}
          value={cells.get(selected) || ''}
          onChange={e => setCell(selected, e.target.value)}
          placeholder="Enter a value or formula like =SUM(A1:A10), =IF(B2>50, 'High', 'Low')"
        />
      </div>

      {/* 3️⃣ SPREADSHEET HIGH-PERFORMANCE GRID */}
      <div className="excel-grid-viewport" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}>
        <table className="excel-table">
          <thead>
            <tr>
              <th className="excel-corner-cell"></th>
              {COLS.map(c => (
                <th key={c} className={`excel-col-head ${selCol === c ? 'active-col' : ''}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }, (_, i) => i + 1).map(r => (
              <tr key={r}>
                <th className={`excel-row-head ${selRow === r ? 'active-row' : ''}`}>{r}</th>
                {COLS.map(c => {
                  const key = c + r;
                  const raw = cells.get(key) || '';
                  const fmt = getFormat(key);
                  const display = raw.startsWith('=') ? get(key) : raw;
                  const isCellSelected = selected === key;

                  return (
                    <td
                      key={key}
                      className={`excel-cell-td ${isCellSelected ? 'selected-cell' : ''}`}
                      style={{
                        backgroundColor: fmt.bg || undefined,
                        color: fmt.color || undefined,
                        fontWeight: fmt.bold ? 'bold' : 'normal',
                        fontStyle: fmt.italic ? 'italic' : 'normal',
                        textDecoration: fmt.underline ? 'underline' : 'none',
                        textAlign: fmt.align || 'left',
                      }}
                      onClick={() => { setSelected(key); setSelectionRange({ start: key, end: key }); }}
                    >
                      <input
                        className="excel-cell-input"
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
        
        {/* Dynamic Grid Expansion Footer */}
        <div style={{ display: 'flex', gap: 12, padding: '12px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Grid Dimensions: {COLS.length} Columns (A–{COLS[COLS.length - 1]}) × {rowCount} Rows</span>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: '4px 10px', background: '#fff', border: '1px solid #cbd5e1' }}
            onClick={() => setColCount(c => c + 26)}
          >
            <Plus size={13} /> Add 26 More Columns
          </button>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: '4px 10px', background: '#fff', border: '1px solid #cbd5e1' }}
            onClick={() => setRowCount(r => r + 50)}
          >
            <Plus size={13} /> Add 50 More Rows
          </button>
        </div>
      </div>

      {/* 4️⃣ FLOATING CHARTS DOCK */}
      {charts.length > 0 && (
        <div className="excel-charts-dock">
          {Array.from(charts).map((ch, i) => {
            const d = chartData(ch.get('range') || 'A1:B5');
            return (
              <div key={i} className="excel-chart-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 12 }}>{String(ch.get('type')).toUpperCase()} ({ch.get('range')})</span>
                  {!readOnly && (
                    <button className="vscode-icon-btn" onClick={() => ydoc.transact(() => charts.delete(i, 1))}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                {ch.get('type') === 'bar' ? <BarChart {...d} /> : ch.get('type') === 'line' ? <LineChart {...d} /> : <PieChart {...d} />}
              </div>
            );
          })}
        </div>
      )}

      {/* 5️⃣ MULTI-SHEET TABS & STATUS BAR */}
      <div className="excel-sheet-tabs-bar">
        <div className="excel-sheet-tabs-list">
          {Array.from(sheetsArray).map((s, idx) => (
            <button
              key={idx}
              className={`excel-sheet-tab-btn ${activeSheet === s ? 'active' : ''}`}
              onClick={() => setActiveSheet(s)}
            >
              {s}
            </button>
          ))}
          {!readOnly && (
            <button
              className="excel-add-sheet-btn"
              title="Add New Sheet"
              onClick={() => {
                const nextName = `Sheet${sheetsArray.length + 1}`;
                ydoc.transact(() => sheetsArray.push([nextName]));
                setActiveSheet(nextName);
              }}
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        <div className="excel-status-stats">
          {rangeStats.numCount > 0 && (
            <>
              <span>AVERAGE: <b>{rangeStats.avg}</b></span>
              <span>COUNT: <b>{rangeStats.count}</b></span>
              <span>MIN: <b>{rangeStats.min}</b></span>
              <span>MAX: <b>{rangeStats.max}</b></span>
              <span>SUM: <b>{rangeStats.sum}</b></span>
            </>
          )}
          <span>Ready</span>
        </div>
      </div>

      {/* Function Wizard Modal */}
      {showFxModal && (
        <div className="modal-backdrop" onClick={() => setShowFxModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px' }}>fx Insert Function</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {[
                { name: 'SUM(range)', desc: 'Adds all numbers in a range of cells.' },
                { name: 'AVERAGE(range)', desc: 'Returns the average (arithmetic mean) of arguments.' },
                { name: 'COUNT(range)', desc: 'Counts the number of cells in a range that contain numbers.' },
                { name: 'MAX(range)', desc: 'Returns the largest value in a set of values.' },
                { name: 'MIN(range)', desc: 'Returns the smallest number in a set of values.' },
                { name: 'PRODUCT(range)', desc: 'Multiplies all numbers in a range.' },
                { name: 'IF(condition, value_if_true, value_if_false)', desc: 'Returns one value if condition is true and another if false.' },
                { name: 'UPPER(text)', desc: 'Converts text to all uppercase.' },
                { name: 'LOWER(text)', desc: 'Converts text to all lowercase.' },
                { name: 'SQRT(number)', desc: 'Returns a positive square root.' },
                { name: 'ROUND(number, decimals)', desc: 'Rounds a number to specified decimals.' },
              ].map(f => (
                <div
                  key={f.name}
                  className="modal-option-row"
                  onClick={() => {
                    setCell(selected, `=${f.name.split('(')[0]}(${selCol}1:${selCol}10)`);
                    setShowFxModal(false);
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pivot Table Modal */}
      {showPivot && (
        <PivotModal
          getRange={(range) => {
            const { c1, c2, r1, r2 } = getRangeCoordinates(...range.split(':'));
            const labels = [], matrix = [];
            for (let r = r1 + 1; r <= r2; r++) {
              labels.push(get(String.fromCharCode(c1) + r));
              matrix.push(get(String.fromCharCode(c2) + r));
            }
            return { labels, matrix };
          }}
          onClose={() => setShowPivot(false)}
        />
      )}
    </div>
  );
}