import { useState } from 'react';
import { X } from 'lucide-react';

export default function PivotModal({ getRange, onClose }) {
  const [range, setRange] = useState('A1:D10');
  const [rowF, setRowF] = useState(0);
  const [valF, setValF] = useState(1);
  const [agg, setAgg] = useState('SUM');
  const [result, setResult] = useState(null);

  const run = () => {
    const { labels, matrix } = getRange(range); // labels = first row header? we'll treat col0 as row, col valF as value
    const map = {};
    labels.forEach((lab, i) => {
      const v = parseFloat(matrix[i]) || 0;
      map[lab] = map[lab] || [];
      map[lab].push(v);
    });
    const rows = Object.entries(map).map(([k, arr]) => {
      const val = agg === 'COUNT' ? arr.length : agg === 'AVG' ? arr.reduce((a,b)=>a+b,0)/arr.length : agg === 'MAX' ? Math.max(...arr) : agg === 'MIN' ? Math.min(...arr) : arr.reduce((a,b)=>a+b,0);
      return [k, Math.round(val * 100) / 100];
    });
    setResult(rows);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>🎨 Pivot Table</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input className="input" style={{ width: 110 }} value={range} onChange={e => setRange(e.target.value)} placeholder="A1:D10" />
          <select className="tb-select" value={valF} onChange={e => setValF(+e.target.value)}><option value={1}>Value col B</option><option value={2}>col C</option><option value={3}>col D</option></select>
          <select className="tb-select" value={agg} onChange={e => setAgg(e.target.value)}>{['SUM','COUNT','AVG','MAX','MIN'].map(a => <option key={a}>{a}</option>)}</select>
          <button className="btn btn-primary" onClick={run}>Build</button>
        </div>
        {result && (
          <table className="sheet-table" style={{ background: '#fff', width: '100%' }}>
            <thead><tr><th>Row</th><th>{agg}</th></tr></thead>
            <tbody>{result.map((r, i) => <tr key={i}><td style={{ padding: 6 }}>{r[0]}</td><td style={{ padding: 6 }}>{r[1]}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}