import { useEffect, useState } from 'react';
import { API } from '../store/authStore';
import { X, FileText, Briefcase, GraduationCap } from 'lucide-react';

export default function TemplateModal({ editor, onClose }) {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    API.get('/execute/templates').then(r => setTemplates(r.data)).catch(() => {});
  }, []);

  const applyTemplate = (content) => {
    if (editor) {
      editor.commands.setContent(content);
      onClose();
    }
  };

  const icons = { document: <FileText size={20} />, business: <Briefcase size={20} />, education: <GraduationCap size={20} /> };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0 }}>Choose a Template</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <div className="template-card" onClick={() => applyTemplate('<p></p>')}>
            <FileText size={24} style={{ color: 'var(--primary)' }} />
            <div className="template-name">Blank Document</div>
            <div className="template-desc">Start from scratch</div>
          </div>
          
          {templates.map(t => (
            <div key={t.id} className="template-card" onClick={() => applyTemplate(t.content)}>
              {icons[t.category] || <FileText size={24} style={{ color: 'var(--primary)' }} />}
              <div className="template-name">{t.name}</div>
              <div className="template-desc">{t.category}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}