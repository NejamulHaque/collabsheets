import { useState } from 'react';
import { FileCode, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

export default function FileTree({ files, activeFile, onSelect, onAdd, onDelete, onRename }) {
  const [editing, setEditing] = useState(null);
  const [newName, setNewName] = useState('');

  const startRename = (file) => {
    setEditing(file.id);
    setNewName(file.name);
  };

  const saveRename = () => {
    if (newName.trim()) onRename(editing, newName.trim());
    setEditing(null);
  };

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <span>FILES</span>
        <button className="btn btn-ghost btn-icon" onClick={onAdd} title="New file"><Plus size={14} /></button>
      </div>
      <div className="file-tree-list">
        {files.map(f => (
          <div key={f.id} className={`file-item ${activeFile === f.id ? 'active' : ''}`} onClick={() => onSelect(f.id)}>
            <FileCode size={14} style={{ color: 'var(--accent)' }} />
            {editing === f.id ? (
              <div style={{ flex: 1, display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                <input className="input" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveRename()} autoFocus style={{ padding: '2px 6px', fontSize: 12 }} />
                <button className="btn btn-ghost btn-icon" onClick={saveRename}><Check size={12} /></button>
                <button className="btn btn-ghost btn-icon" onClick={() => setEditing(null)}><X size={12} /></button>
              </div>
            ) : (
              <>
                <span style={{ flex: 1 }}>{f.name}</span>
                <button className="btn btn-ghost btn-icon" onClick={e => { e.stopPropagation(); startRename(f); }}><Edit2 size={12} /></button>
                <button className="btn btn-ghost btn-icon" onClick={e => { e.stopPropagation(); onDelete(f.id); }}><Trash2 size={12} /></button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}