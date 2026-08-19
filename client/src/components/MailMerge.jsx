import { useState } from 'react';
import { X, Upload, FileDown } from 'lucide-react';

export default function MailMerge({ editor, onClose }) {
  const [rows, setRows] = useState([]);
  const [cols, setCols] = useState([]);

  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/).map(l => l.split(',').map(c => c.trim()));
    setCols(lines[0] || []);
    setRows(lines.slice(1));
  };

  const onFile = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => parseCSV(String(r.result)); r.readAsText(f);
  };

  const insertField = (c) => editor?.chain().focus().insertContent(`{{${c}}}`).run();

  const merge = () => {
    if (!editor || !rows.length) return alert('Load a CSV first.');
    const tpl = editor.getHTML();
    const pages = rows.map(r => {
      let html = tpl;
      cols.forEach((c, i) => { html = html.split(`{{${c}}}`).join(r[i] || ''); });
      return `<div style="page-break-after:always">${html}</div>`;
    }).join('');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([pages], { type: 'text/html' }));
    a.download = 'mail-merge.html';
    a.click();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>📧 Mail Merge</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
          <Upload size={14} /> Upload CSV (name,email,...)
          <input type="file" hidden accept=".csv" onChange={onFile} />
        </label>
        {cols.length > 0 && (<>
          <div style={{ margin: '14px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {cols.map(c => <button key={c} className="badge" onClick={() => insertField(c)}>{'{{' + c + '}}'}</button>)}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>{rows.length} recipients ready.</div>
          <button className="btn btn-primary" onClick={merge}><FileDown size={14} /> Finish & Merge ({rows.length} docs)</button>
        </>)}
      </div>
    </div>
  );
}