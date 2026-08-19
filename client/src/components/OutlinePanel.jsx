import { useEffect, useState } from 'react';
import { ListTree } from 'lucide-react';

export default function OutlinePanel({ editor }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!editor) return;
    const extract = () => {
      const out = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') out.push({ level: node.attrs.level, text: node.textContent || '(untitled)', pos });
      });
      setItems(out);
    };
    extract();
    editor.on('update', extract);
    return () => { editor.off('update', extract); };
  }, [editor]);

  if (!editor) return null;
  return (
    <div className="outline-panel glass">
      <div className="outline-title"><ListTree size={14} /> Outline</div>
      <div className="outline-list">
        {items.length === 0 && <div className="empty-state-small">No headings yet</div>}
        {items.map((h, i) => (
          <button key={i} className="outline-item" style={{ paddingLeft: 8 + (h.level - 1) * 12 }}
            onClick={() => editor.chain().focus().setTextSelection(h.pos + 1).scrollIntoView().run()}>
            {h.text}
          </button>
        ))}
      </div>
    </div>
  );
}