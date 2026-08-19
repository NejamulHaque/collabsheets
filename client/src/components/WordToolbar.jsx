import {
  Bold, Italic, Underline as UIcon, Strikethrough, List, ListOrdered, CheckSquare,
  Quote, Code, Table as TIcon, Image as ImgIcon, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight, Highlighter, Download, Printer, Type,
} from 'lucide-react';

export default function WordToolbar({ editor, onExport, onPrint, words }) {
  if (!editor) return null;
  const B = ({ on, click, children, title }) => (
    <button type="button" className={`tb-btn ${on ? 'active' : ''}`} title={title} onClick={click}>{children}</button>
  );
  return (
    <div className="glass word-toolbar">
      <B title="Bold" on={editor.isActive('bold')} click={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></B>
      <B title="Italic" on={editor.isActive('italic')} click={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></B>
      <B title="Underline" on={editor.isActive('underline')} click={() => editor.chain().focus().toggleUnderline().run()}><UIcon size={15} /></B>
      <B title="Strikethrough" on={editor.isActive('strike')} click={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={15} /></B>
      <B title="Highlight" on={editor.isActive('highlight')} click={() => editor.chain().focus().toggleHighlight().run()}><Highlighter size={15} /></B>
      <label className="tb-color" title="Text color"><input type="color" onChange={e => editor.chain().focus().setColor(e.target.value).run()} /><Type size={14} /></label>
      <span className="tb-sep" />
      <B title="Heading 1" on={editor.isActive('heading', { level: 1 })} click={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><b>H1</b></B>
      <B title="Heading 2" on={editor.isActive('heading', { level: 2 })} click={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><b>H2</b></B>
      <B title="Heading 3" on={editor.isActive('heading', { level: 3 })} click={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><b>H3</b></B>
      <span className="tb-sep" />
      <B title="Bullet list" on={editor.isActive('bulletList')} click={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></B>
      <B title="Numbered list" on={editor.isActive('orderedList')} click={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></B>
      <B title="Task list" on={editor.isActive('taskList')} click={() => editor.chain().focus().toggleTaskList().run()}><CheckSquare size={15} /></B>
      <B title="Quote" on={editor.isActive('blockquote')} click={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={15} /></B>
      <B title="Code block" on={editor.isActive('codeBlock')} click={() => editor.chain().focus().toggleCodeBlock().run()}><Code size={15} /></B>
      <span className="tb-sep" />
      <B title="Align left" on={editor.isActive({ textAlign: 'left' })} click={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={15} /></B>
      <B title="Align center" on={editor.isActive({ textAlign: 'center' })} click={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={15} /></B>
      <B title="Align right" on={editor.isActive({ textAlign: 'right' })} click={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight size={15} /></B>
      <span className="tb-sep" />
      <B title="Insert table" click={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TIcon size={15} /></B>
      <B title="Insert image" click={() => { const url = prompt('Image URL'); if (url) editor.chain().focus().setImage({ src: url }).run(); }}><ImgIcon size={15} /></B>
      <B title="Insert link" click={() => { const url = prompt('Link URL'); if (url) editor.chain().focus().setLink({ href: url }).run(); }}><LinkIcon size={15} /></B>
      <div style={{ flex: 1 }} />
      <span style={{ color: 'var(--muted)', fontSize: 12, marginRight: 8 }}>{words} words</span>
      <B title="Download .doc" click={onExport}><Download size={15} /></B>
      <B title="Print / Save as PDF" click={onPrint}><Printer size={15} /></B>
    </div>
  );
}