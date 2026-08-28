import { useState, useRef, useEffect } from 'react';
import {
  Bold, Italic, Underline as UIcon, Strikethrough, Highlighter, Type, List, ListOrdered,
  CheckSquare, Quote, Code, Table as TIcon, Image as ImgIcon, Link as LinkIcon, Minus,
  CalendarDays, AlignLeft, AlignCenter, AlignRight, AlignJustify, Eraser, Download,
  Printer, FileCode2, Pilcrow, BookOpen, ListTree, Subscript as SubIcon, Superscript as SupIcon,
  SpellCheck, ZoomIn, Volume2, VolumeX, FileText, Bookmark, Undo2, Redo2, ChevronDown,
  PenTool, Hash, X, Check,
} from 'lucide-react';

const STANDARD_TABS = ['File', 'Home', 'Insert', 'Draw', 'Design', 'Layout', 'References', 'Review', 'View'];
const FONTS = [
  'Calibri', 'Aptos', 'Arial', 'Times New Roman', 'Georgia', 'Segoe UI',
  'Verdana', 'Trebuchet MS', 'Courier New', 'Roboto'
];
const SIZES = ['8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '36px', '48px', '72px'];

export default function WordRibbon({
  editor,
  title,
  onPrint,
  onOpenTemplates,
  words = 0,
  chars = 0,
  page,
  setPage,
  isEditingHF = false,
  setIsEditingHF,
  onInsertPageNumber,
  onInsertDateHF,
}) {
  const [tab, setTab] = useState('Home');
  const [spell, setSpell] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    if (isEditingHF) {
      setTab('Header & Footer');
    } else if (tab === 'Header & Footer') {
      setTab('Home');
    }
  }, [isEditingHF]);

  if (!editor) return null;

  const B = ({ on, click, children, t, disabled }) => (
    <button
      type="button"
      className={`word-tb-btn ${on ? 'active' : ''}`}
      title={t}
      onClick={click}
      disabled={disabled}
    >
      {children}
    </button>
  );

  const Sep = () => <span className="word-tb-sep" />;

  const download = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
  };

  const exportDoc = () => download(
    new Blob(
      [`<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body>${editor.getHTML()}</body></html>`],
      { type: 'application/msword' }
    ),
    `${title || 'document'}.doc`
  );

  const exportHTML = () => download(
    new Blob([editor.getHTML()], { type: 'text/html' }),
    `${title || 'document'}.html`
  );

  const exportText = () => download(
    new Blob([editor.getText()], { type: 'text/plain' }),
    `${title || 'document'}.txt`
  );

  const generateTOC = () => {
    const headings = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'heading') headings.push({ level: node.attrs.level, text: node.textContent });
    });
    if (!headings.length) return alert('No headings found. Add Heading 1 or Heading 2 headings in your document first.');
    editor.chain().focus().insertContentAt(0, '<h2>Table of Contents</h2><ul>' + headings.map(h => `<li style="margin-left:${(h.level - 1) * 20}px"><b>${h.text}</b></li>`).join('') + '</ul><hr/>').run();
  };

  const toggleReadAloud = () => {
    if (!synthRef.current) return alert('Text-to-speech is not supported in this browser.');
    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    } else {
      const text = editor.getText();
      if (!text.trim()) return alert('Document is empty.');
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.0;
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      synthRef.current.speak(utter);
      setIsSpeaking(true);
    }
  };

  const insertTableCustom = (rows, cols) => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    setShowTablePicker(false);
  };

  const curFont = editor.getAttributes('textStyle').fontFamily || 'Calibri';
  const curSize = editor.getAttributes('textStyle').fontSize || '12px';

  const displayedTabs = isEditingHF ? [...STANDARD_TABS, 'Header & Footer'] : STANDARD_TABS;

  return (
    <div className="word-ribbon-container">
      {/* 1️⃣ WORD 365 TOP TABS BAR */}
      <div className="word-ribbon-tabs">
        <div className="word-brand-badge">
          <FileText size={18} />
          <span>Word</span>
        </div>
        {displayedTabs.map(t => (
          <button
            key={t}
            className={`word-ribbon-tab ${tab === t ? 'active' : ''} ${t === 'File' ? 'tab-file' : ''} ${t === 'Header & Footer' ? 'tab-contextual' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div className="word-doc-meta">
          <span>{words} words</span>
          <span>•</span>
          <span>{chars} chars</span>
          <span>•</span>
          <span style={{ color: 'var(--success)', fontWeight: 600 }}>Saved</span>
        </div>
      </div>

      {/* 2️⃣ WORD RIBBON COMMAND BAR */}
      <div className="word-ribbon-body">
        {/* HEADER & FOOTER CONTEXTUAL TAB */}
        {tab === 'Header & Footer' && (
          <div className="ribbon-chunk-row">
            <div className="ribbon-chunk">
              <div className="chunk-items">
                <button className="word-btn-tool" onClick={() => onInsertPageNumber && onInsertPageNumber('simple')}>
                  <Hash size={16} />
                  <span>Page Number</span>
                </button>
                <button className="word-btn-tool" onClick={() => onInsertPageNumber && onInsertPageNumber('page-of-pages')}>
                  <Bookmark size={16} />
                  <span>Page 1 of 1</span>
                </button>
                <button className="word-btn-tool" onClick={onInsertDateHF}>
                  <CalendarDays size={16} />
                  <span>Date & Time</span>
                </button>
              </div>
              <span className="chunk-label">Header & Footer Elements</span>
            </div>
            <Sep />
            <div className="ribbon-chunk">
              <div className="chunk-items">
                <button
                  className="word-action-card primary"
                  style={{ background: '#185abd', color: '#fff', borderColor: '#185abd' }}
                  onClick={() => setIsEditingHF && setIsEditingHF(false)}
                >
                  <X size={16} />
                  <span>Close Header & Footer</span>
                </button>
              </div>
              <span className="chunk-label">Close</span>
            </div>
          </div>
        )}

        {/* FILE TAB */}
        {tab === 'File' && (
          <div className="ribbon-chunk-row">
            <div className="ribbon-chunk">
              <div className="chunk-items">
                <button className="word-action-card" onClick={exportDoc}>
                  <Download size={16} />
                  <span>Export .docx</span>
                </button>
                <button className="word-action-card" onClick={exportHTML}>
                  <FileCode2 size={16} />
                  <span>Export HTML</span>
                </button>
                <button className="word-action-card" onClick={exportText}>
                  <FileText size={16} />
                  <span>Export Text</span>
                </button>
                <button className="word-action-card" onClick={onPrint}>
                  <Printer size={16} />
                  <span>Print PDF</span>
                </button>
              </div>
              <span className="chunk-label">Export & Print</span>
            </div>
          </div>
        )}

        {/* HOME TAB */}
        {tab === 'Home' && (
          <div className="ribbon-chunk-row">
            {/* Undo / Redo */}
            <div className="ribbon-chunk">
              <div className="chunk-items" style={{ gap: 2 }}>
                <B t="Undo (Ctrl+Z)" click={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo2 size={14} /></B>
                <B t="Redo (Ctrl+Y)" click={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo2 size={14} /></B>
              </div>
              <span className="chunk-label">Undo</span>
            </div>
            <Sep />

            {/* Font */}
            <div className="ribbon-chunk">
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <select
                  className="word-select"
                  style={{ width: 120 }}
                  value={curFont}
                  onChange={e => editor.chain().focus().setFontFamily(e.target.value).run()}
                >
                  {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <select
                  className="word-select"
                  style={{ width: 56 }}
                  value={curSize}
                  onChange={e => editor.chain().focus().setFontSize(e.target.value).run()}
                >
                  {SIZES.map(s => <option key={s} value={s}>{parseInt(s)}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                <B t="Bold (Ctrl+B)" on={editor.isActive('bold')} click={() => editor.chain().focus().toggleBold().run()}><Bold size={13} /></B>
                <B t="Italic (Ctrl+I)" on={editor.isActive('italic')} click={() => editor.chain().focus().toggleItalic().run()}><Italic size={13} /></B>
                <B t="Underline (Ctrl+U)" on={editor.isActive('underline')} click={() => editor.chain().focus().toggleUnderline().run()}><UIcon size={13} /></B>
                <B t="Strikethrough" on={editor.isActive('strike')} click={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={13} /></B>
                <B t="Subscript" on={editor.isActive('subscript')} click={() => editor.chain().focus().toggleSubscript().run()}><SubIcon size={13} /></B>
                <B t="Superscript" on={editor.isActive('superscript')} click={() => editor.chain().focus().toggleSuperscript().run()}><SupIcon size={13} /></B>
                <B t="Highlight" on={editor.isActive('highlight')} click={() => editor.chain().focus().toggleHighlight().run()}><Highlighter size={13} /></B>
                <label className="word-color-picker" title="Font Color">
                  <input type="color" onChange={e => editor.chain().focus().setColor(e.target.value).run()} />
                  <Type size={13} />
                </label>
                <B t="Clear Formatting" click={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><Eraser size={13} /></B>
              </div>
              <span className="chunk-label">Font</span>
            </div>
            <Sep />

            {/* Paragraph */}
            <div className="ribbon-chunk">
              <div style={{ display: 'flex', gap: 2 }}>
                <B t="Bullet List" on={editor.isActive('bulletList')} click={() => editor.chain().focus().toggleBulletList().run()}><List size={13} /></B>
                <B t="Numbered List" on={editor.isActive('orderedList')} click={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={13} /></B>
                <B t="Task List" on={editor.isActive('taskList')} click={() => editor.chain().focus().toggleTaskList().run()}><CheckSquare size={13} /></B>
              </div>
              <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                <B t="Align Left" on={editor.isActive({ textAlign: 'left' })} click={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={13} /></B>
                <B t="Align Center" on={editor.isActive({ textAlign: 'center' })} click={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={13} /></B>
                <B t="Align Right" on={editor.isActive({ textAlign: 'right' })} click={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight size={13} /></B>
                <B t="Justify" on={editor.isActive({ textAlign: 'justify' })} click={() => editor.chain().focus().setTextAlign('justify').run()}><AlignJustify size={13} /></B>
              </div>
              <span className="chunk-label">Paragraph</span>
            </div>
            <Sep />

            {/* Styles Gallery */}
            <div className="ribbon-chunk" style={{ flex: 1 }}>
              <div className="word-styles-gallery">
                <button className="style-box normal" onClick={() => editor.chain().focus().setParagraph().run()}>
                  <span>Normal</span>
                  <small>Text</small>
                </button>
                <button className="style-box h1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                  <span>Heading 1</span>
                  <small>H1</small>
                </button>
                <button className="style-box h2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                  <span>Heading 2</span>
                  <small>H2</small>
                </button>
                <button className="style-box h3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                  <span>Heading 3</span>
                  <small>H3</small>
                </button>
                <button className="style-box quote" onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                  <span>Quote</span>
                  <small>Callout</small>
                </button>
              </div>
              <span className="chunk-label">Styles</span>
            </div>
          </div>
        )}

        {/* INSERT TAB */}
        {tab === 'Insert' && (
          <div className="ribbon-chunk-row">
            {/* Tables */}
            <div className="ribbon-chunk">
              <div className="chunk-items" style={{ position: 'relative' }}>
                <button className="word-btn-tool" onClick={() => setShowTablePicker(!showTablePicker)}>
                  <TIcon size={16} />
                  <span>Table</span>
                  <ChevronDown size={12} />
                </button>
                {showTablePicker && (
                  <div className="word-table-picker-popup">
                    <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 6 }}>Insert Table (Rows x Cols)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 18px)', gap: 3 }}>
                      {[1, 2, 3, 4, 5].map(r => (
                        [1, 2, 3, 4, 5].map(c => (
                          <div
                            key={`${r}-${c}`}
                            className="table-cell-pick"
                            onClick={() => insertTableCustom(r, c)}
                            title={`${r}x${c} Table`}
                          />
                        ))
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <span className="chunk-label">Tables</span>
            </div>
            <Sep />

            {/* Illustrations & Media */}
            <div className="ribbon-chunk">
              <div className="chunk-items">
                <button className="word-btn-tool" onClick={() => {
                  const url = prompt('Image URL or web picture:');
                  if (url) editor.chain().focus().setImage({ src: url }).run();
                }}>
                  <ImgIcon size={16} />
                  <span>Picture</span>
                </button>
                <button className="word-btn-tool" onClick={() => {
                  const href = prompt('Web link (URL):');
                  if (href) editor.chain().focus().setLink({ href }).run();
                }}>
                  <LinkIcon size={16} />
                  <span>Link</span>
                </button>
              </div>
              <span className="chunk-label">Illustrations & Links</span>
            </div>
            <Sep />

            {/* Header & Footer Triggers */}
            <div className="ribbon-chunk">
              <div className="chunk-items">
                <button className="word-btn-tool" onClick={() => setIsEditingHF && setIsEditingHF(true)}>
                  <FileText size={16} />
                  <span>Header</span>
                </button>
                <button className="word-btn-tool" onClick={() => setIsEditingHF && setIsEditingHF(true)}>
                  <Minus size={16} />
                  <span>Footer</span>
                </button>
                <button className="word-btn-tool" onClick={() => onInsertPageNumber && onInsertPageNumber('simple')}>
                  <Hash size={16} />
                  <span>Page Number</span>
                </button>
              </div>
              <span className="chunk-label">Header & Footer</span>
            </div>
            <Sep />

            {/* Content & Code */}
            <div className="ribbon-chunk">
              <div className="chunk-items">
                <button className="word-btn-tool" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                  <Minus size={16} />
                  <span>Page Break</span>
                </button>
                <button className="word-btn-tool" onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
                  <Code size={16} />
                  <span>Code Block</span>
                </button>
                <button className="word-btn-tool" onClick={() => editor.chain().focus().insertContent(`<b>Date: ${new Date().toLocaleDateString()}</b> `).run()}>
                  <CalendarDays size={16} />
                  <span>Date</span>
                </button>
                <button className="word-btn-tool" onClick={onOpenTemplates}>
                  <BookOpen size={16} />
                  <span>Templates</span>
                </button>
              </div>
              <span className="chunk-label">Blocks</span>
            </div>
          </div>
        )}

        {/* DRAW TAB */}
        {tab === 'Draw' && (
          <div className="ribbon-chunk-row">
            <div className="ribbon-chunk">
              <div className="chunk-items">
                {['#000000', '#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea'].map(col => (
                  <button
                    key={col}
                    className="word-pen-btn"
                    style={{ backgroundColor: col }}
                    onClick={() => editor.chain().focus().setColor(col).run()}
                    title={`Pen ${col}`}
                  >
                    <PenTool size={13} color="#fff" />
                  </button>
                ))}
              </div>
              <span className="chunk-label">Pens</span>
            </div>
            <Sep />
            <div className="ribbon-chunk">
              <div className="chunk-items">
                <button className="word-btn-tool" onClick={() => editor.chain().focus().toggleHighlight().run()}>
                  <Highlighter size={16} />
                  <span>Highlighter</span>
                </button>
                <button className="word-btn-tool" onClick={() => editor.chain().focus().unsetAllMarks().run()}>
                  <Eraser size={16} />
                  <span>Eraser</span>
                </button>
              </div>
              <span className="chunk-label">Tools</span>
            </div>
          </div>
        )}

        {/* DESIGN TAB */}
        {tab === 'Design' && (
          <div className="ribbon-chunk-row">
            <div className="ribbon-chunk">
              <div className="chunk-items">
                {[
                  { id: 'classic', label: 'Classic', color: '#ffffff' },
                  { id: 'serif', label: 'Serif', color: '#fdf6e3' },
                  { id: 'blue', label: 'Azure', color: '#eff6ff' },
                  { id: 'dark', label: 'Dark', color: '#1e293b' },
                ].map(thm => (
                  <button
                    key={thm.id}
                    className={`theme-pill ${page.theme === thm.id ? 'active' : ''}`}
                    onClick={() => setPage({ ...page, theme: thm.id })}
                  >
                    <span style={{ width: 12, height: 12, borderRadius: 2, background: thm.color, border: '1px solid #999' }} />
                    <span>{thm.label}</span>
                  </button>
                ))}
              </div>
              <span className="chunk-label">Page Themes</span>
            </div>
            <Sep />
            <div className="ribbon-chunk">
              <div className="chunk-items">
                {['CONFIDENTIAL', 'DRAFT', 'SAMPLE'].map(wm => (
                  <button
                    key={wm}
                    className="btn btn-ghost"
                    style={{ padding: '4px 8px', fontSize: 11 }}
                    onClick={() => alert(`Watermark "${wm}" set.`)}
                  >
                    {wm}
                  </button>
                ))}
              </div>
              <span className="chunk-label">Watermark</span>
            </div>
          </div>
        )}

        {/* LAYOUT TAB */}
        {tab === 'Layout' && (
          <div className="ribbon-chunk-row">
            <div className="ribbon-chunk">
              <select
                className="word-select"
                value={page.margin}
                onChange={e => setPage({ ...page, margin: e.target.value })}
              >
                <option value="normal">Normal (1 in)</option>
                <option value="narrow">Narrow (0.5 in)</option>
                <option value="wide">Wide (1.5 in)</option>
              </select>
              <span className="chunk-label">Margins</span>
            </div>
            <Sep />
            <div className="ribbon-chunk">
              <div className="chunk-items">
                <button
                  className={`btn ${page.orientation === 'portrait' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '4px 8px', fontSize: 11 }}
                  onClick={() => setPage({ ...page, orientation: 'portrait' })}
                >
                  Portrait
                </button>
                <button
                  className={`btn ${page.orientation === 'landscape' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '4px 8px', fontSize: 11 }}
                  onClick={() => setPage({ ...page, orientation: 'landscape' })}
                >
                  Landscape
                </button>
              </div>
              <span className="chunk-label">Orientation</span>
            </div>
            <Sep />
            <div className="ribbon-chunk">
              <select className="word-select">
                <option>Letter (8.5 × 11")</option>
                <option>A4 (210 × 297mm)</option>
              </select>
              <span className="chunk-label">Size</span>
            </div>
          </div>
        )}

        {/* REFERENCES TAB */}
        {tab === 'References' && (
          <div className="ribbon-chunk-row">
            <div className="ribbon-chunk">
              <div className="chunk-items">
                <button className="word-btn-tool" onClick={generateTOC}>
                  <ListTree size={16} />
                  <span>Table of Contents</span>
                </button>
                <button className="word-btn-tool" onClick={() => editor.chain().focus().insertContent(' <sup>[1]</sup>').run()}>
                  <Bookmark size={16} />
                  <span>Insert Footnote</span>
                </button>
              </div>
              <span className="chunk-label">Table of Contents & Notes</span>
            </div>
          </div>
        )}

        {/* REVIEW TAB */}
        {tab === 'Review' && (
          <div className="ribbon-chunk-row">
            <div className="ribbon-chunk">
              <div className="chunk-items">
                <button className={`word-btn-tool ${spell ? 'active' : ''}`} onClick={() => {
                  editor.view.dom.spellcheck = !spell;
                  setSpell(!spell);
                }}>
                  <SpellCheck size={16} />
                  <span>Spell Check: {spell ? 'On' : 'Off'}</span>
                </button>
                <button className={`word-btn-tool ${isSpeaking ? 'active' : ''}`} onClick={toggleReadAloud}>
                  {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  <span>{isSpeaking ? 'Stop Reading' : 'Read Aloud'}</span>
                </button>
                <button className="word-btn-tool" onClick={() => alert(`Document Statistics:\n• Words: ${words}\n• Characters: ${chars}\n• Paragraphs: ${editor.getText().split('\n\n').length}\n• Est. Reading Time: ~${Math.max(1, Math.round(words / 200))} min`)}>
                  <Pilcrow size={16} />
                  <span>Word Count</span>
                </button>
              </div>
              <span className="chunk-label">Proofing & Speech</span>
            </div>
          </div>
        )}

        {/* VIEW TAB */}
        {tab === 'View' && (
          <div className="ribbon-chunk-row">
            <div className="ribbon-chunk">
              <div className="chunk-items">
                <ZoomIn size={16} />
                <select
                  className="word-select"
                  value={page.zoom}
                  onChange={e => setPage({ ...page, zoom: +e.target.value })}
                >
                  {[50, 75, 90, 100, 110, 125, 150, 200].map(z => (
                    <option key={z} value={z}>{z}%</option>
                  ))}
                </select>
                <button className="word-btn-tool" onClick={() => setPage({ ...page, zoom: 100 })}>
                  <span>100% Zoom</span>
                </button>
              </div>
              <span className="chunk-label">Zoom</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}