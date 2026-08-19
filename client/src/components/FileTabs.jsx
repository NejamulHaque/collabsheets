import { Search } from 'lucide-react';

export default function FileTabs({ files, active, onSelect, onSearch }) {
  return (
    <div className="file-tabs">
      {files.map(f => (
        <div key={f} className={`file-tab ${f === active ? 'active' : ''}`} onClick={() => onSelect(f)}>
          <span>{f}</span>
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <button className="btn btn-ghost btn-icon" style={{ marginBottom: 4 }} title="Find & Replace" onClick={onSearch}><Search size={14} /></button>
    </div>
  );
}