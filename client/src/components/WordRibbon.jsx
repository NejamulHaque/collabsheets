import { useState } from 'react';
import {
  Bold, Italic, Underline as UIcon, Strikethrough, Highlighter, Type, List, ListOrdered,
  CheckSquare, Quote, Code, Table as TIcon, Image as ImgIcon, Link as LinkIcon, Minus,
  CalendarDays, AlignLeft, AlignCenter, AlignRight, AlignJustify, Eraser, Download,
  Printer, FileCode2, Pilcrow, BookOpen, ListTree, Subscript as SubIcon, Superscript as SupIcon,
  SpellCheck, ZoomIn,
} from 'lucide-react';

const TABS = ['Home', 'Insert', 'Design', 'Layout', 'References', 'Review', 'View'];
const FONTS = ['Calibri', 'Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS'];
const SIZES = ['10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '36px', '48px'];

export default function WordRibbon({ editor, title, onPrint, onOpenTemplates, words, chars, page, setPage }) {
  const [tab, setTab] = useState('Home');
  const [spell, setSpell] = useState(true);
  if (!editor) return null;

  const B = ({ on, click, children, t }) => (
    <button type="button" className={`tb-btn ${on ? 'active' : ''}`} title={t} onClick={click}>{children}</button>
  );
  const Sep = () => <span className="tb-sep" />;
  const download = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); };
  const exportDoc = () => download(new Blob([`<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body>${editor.getHTML()}</body></html>`], { type: 'application/msword' }), `${title || 'document'}.doc`);
  const exportHTML = () => download(new Blob([editor.getHTML()], { type: 'text/html' }), `${title || 'document'}.html`);

  const generateTOC = () => {
    const headings = [];
    editor.state.doc.descendants((node) => { if (node.type.name === 'heading') headings.push({ level: node.attrs.level, text: node.textContent }); });
    if (!headings.length) return alert('No headings found! Add H1/H2 headings first.');
    editor.chain().focus().insertContentAt(0, '<h2>Table of Contents</h2><ul>' + headings.map(h => `<li style="margin-left:${(h.level - 1) * 20}px">${h.text}</li>`).join('') + '</ul><hr/>').run();
  };

  const curFont = editor.getAttributes('textStyle').fontFamily || 'Calibri';
  const curSize = editor.getAttributes('textStyle').fontSize || '12px';

  return (
    <div className="glass ribbon">
      <div className="ribbon-tabs">
        {TABS.map(t => <button key={t} className={`ribbon-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>)}
        <div style={{ flex: 1 }} />
        <span style={{ color: 'var(--muted)', fontSize: 12, paddingBottom: 6 }}>{words} words • {chars} characters</span>
      </div>

      <div className="ribbon-body">
        {tab === 'Home' && (<>
          <select className="tb-select" style={{ width: 120 }} value={curFont} onChange={e => editor.chain().focus().setFontFamily(e.target.value).run()}>
            {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select className="tb-select" style={{ width: 64 }} value={curSize} onChange={e => editor.chain().focus().setFontSize(e.target.value).run()}>
            {SIZES.map(s => <option key={s} value={s}>{parseInt(s)}</option>)}
          </select>
          <Sep />
          <B t="Bold" on={editor.isActive('bold')} click={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></B>
          <B t="Italic" on={editor.isActive('italic')} click={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></B>
          <B t="Underline" on={editor.isActive('underline')} click={() => editor.chain().focus().toggleUnderline().run()}><UIcon size={15} /></B>
          <B t="Strikethrough" on={editor.isActive('strike')} click={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={15} /></B>
          <B t="Subscript" on={editor.isActive('subscript')} click={() => editor.chain().focus().toggleSubscript().run()}><SubIcon size={15} /></B>
          <B t="Superscript" on={editor.isActive('superscript')} click={() => editor.chain().focus().toggleSuperscript().run()}><SupIcon size={15} /></B>
          <B t="Highlight" on={editor.isActive('highlight')} click={() => editor.chain().focus().toggleHighlight().run()}><Highlighter size={15} /></B>
          <label className="tb-color" title="Text color"><input type="color" onChange={e => editor.chain().focus().setColor(e.target.value).run()} /><Type size={14} /></label>
          <B t="Clear formatting" click={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><Eraser size={15} /></B>
          <Sep />
          <B t="Bullet list" on={editor.isActive('bulletList')} click={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></B>
          <B t="Numbered list" on={editor.isActive('orderedList')} click={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></B>
          <B t="Task list" on={editor.isActive('taskList')} click={() => editor.chain().focus().toggleTaskList().run()}><CheckSquare size={15} /></B>
          <Sep />
          <B t="Align left" on={editor.isActive({ textAlign: 'left' })} click={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={15} /></B>
          <B t="Center" on={editor.isActive({ textAlign: 'center' })} click={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={15} /></B>
          <B t="Right" on={editor.isActive({ textAlign: 'right' })} click={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight size={15} /></B>
          <B t="Justify" on={editor.isActive({ textAlign: 'justify' })} click={() => editor.chain().focus().setTextAlign('justify').run()}><AlignJustify size={15} /></B>
          <Sep />
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>STYLES</span>
          <button className="style-card" onClick={() => editor.chain().focus().setParagraph().run()}>Normal</button>
          <button className="style-card" style={{ fontWeight: 800 }} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>Heading 1</button>
          <button className="style-card" style={{ fontWeight: 700 }} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>Heading 2</button>
          <button className="style-card" style={{ fontWeight: 700, fontSize: 14 }} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>Title</button>
        </>)}

        {tab === 'Insert' && (<>
          <B t="Templates" click={onOpenTemplates}><BookOpen size={15} /></B>
          <B t="Table 3×3" click={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TIcon size={15} /></B>
          <B t="Image" click={() => { const u = prompt('Image URL'); if (u) editor.chain().focus().setImage({ src: u }).run(); }}><ImgIcon size={15} /></B>
          <B t="Link" click={() => { const u = prompt('Link URL'); if (u) editor.chain().focus().setLink({ href: u }).run(); }}><LinkIcon size={15} /></B>
          <B t="Horizontal line" click={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={15} /></B>
          <B t="Code block" on={editor.isActive('codeBlock')} click={() => editor.chain().focus().toggleCodeBlock().run()}><Code size={15} /></B>
          <B t="Quote" on={editor.isActive('blockquote')} click={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={15} /></B>
          <B t="Today's date" click={() => editor.chain().focus().insertContent(new Date().toLocaleDateString()).run()}><CalendarDays size={15} /></B>
        </>)}

        {tab === 'Design' && (<>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>PAGE THEME</span>
          {[['classic', '#ffffff'], ['serif', '#fdf6e3'], ['blue', '#eff6ff'], ['dark', '#1e293b']].map(([name, color]) => (
            <button key={name} title={name} onClick={() => setPage({ ...page, theme: name })}
              style={{ width: 34, height: 26, borderRadius: 6, background: color, border: page.theme === name ? '2px solid var(--primary)' : '2px solid var(--border)', cursor: 'pointer' }} />
          ))}
        </>)}

        {tab === 'Layout' && (<>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>MARGINS</span>
          <select className="tb-select" value={page.margin} onChange={e => setPage({ ...page, margin: e.target.value })}>
            <option value="normal">Normal</option><option value="narrow">Narrow</option><option value="wide">Wide</option>
          </select>
          <Sep />
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>ORIENTATION</span>
          <button className="style-card" onClick={() => setPage({ ...page, orientation: page.orientation === 'portrait' ? 'landscape' : 'portrait' })}>
            {page.orientation === 'portrait' ? ' Portrait' : ' Landscape'}
          </button>
        </>)}

        {tab === 'References' && (<>
          <B t="Table of Contents" click={generateTOC}><ListTree size={15} /></B>
          <B t="Word count" click={() => alert(`${words} words\n${chars} characters\n~${Math.max(1, Math.round(words / 200))} min read`)}><Pilcrow size={15} /></B>
        </>)}

        {tab === 'Review' && (<>
          <B t="Toggle spellcheck" on={spell} click={() => { editor.view.dom.spellcheck = !spell; setSpell(!spell); }}><SpellCheck size={15} /></B>
          <B t="Word count" click={() => alert(`${words} words • ${chars} characters`)}><Pilcrow size={15} /></B>
        </>)}

        {tab === 'View' && (<>
          <B t="Zoom" click={() => {}}><ZoomIn size={15} /></B>
          <select className="tb-select" value={page.zoom} onChange={e => setPage({ ...page, zoom: +e.target.value })}>
            {[75, 90, 100, 110, 125, 150].map(z => <option key={z} value={z}>{z}%</option>)}
          </select>
          <Sep />
          <B t="Download .doc" click={exportDoc}><Download size={15} /></B>
          <B t="Download .html" click={exportHTML}><FileCode2 size={15} /></B>
          <B t="Print / PDF" click={onPrint}><Printer size={15} /></B>
        </>)}
      </div>
    </div>
  );
}