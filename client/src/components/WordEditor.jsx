import { useState, useEffect, useRef } from 'react';
import { EditorContent } from '@tiptap/react';
import WordRibbon from './WordRibbon';
import WordNavigationPane from './WordNavigationPane';
import { FileText, SpellCheck, ZoomIn, ZoomOut, Eye, Layers, X, Check, Calendar, Hash, Bookmark } from 'lucide-react';

export default function WordEditor({
  editor,
  title,
  canEdit = true,
  page,
  setPage,
  onOpenTemplates,
  onPrint,
}) {
  const [showOutline, setShowOutline] = useState(() => typeof window !== 'undefined' && window.innerWidth > 768);
  const [viewMode, setViewMode] = useState('print'); // 'print', 'web', 'focus'
  const [isEditingHF, setIsEditingHF] = useState(false); // Header & Footer edit mode

  // Header & Footer state
  const [headerLeft, setHeaderLeft] = useState(title || 'Untitled Document');
  const [headerRight, setHeaderRight] = useState('Page 1');
  const [footerLeft, setFooterLeft] = useState('Confidential');
  const [footerRight, setFooterRight] = useState('Collab-Sheets Word');

  // Dynamic Multi-Page Height Tracking
  const [docContentHeight, setDocContentHeight] = useState(1056);
  const sheetRef = useRef(null);
  const A4_PAGE_HEIGHT = 1056;

  useEffect(() => {
    if (title) setHeaderLeft(title);
  }, [title]);

  useEffect(() => {
    if (!editor) return;
    const calculateDocHeight = () => {
      const pmEl = document.querySelector('.word-tiptap-wrap .ProseMirror');
      if (pmEl) {
        const measured = pmEl.scrollHeight + 180; // Include header & footer margins
        setDocContentHeight(Math.max(A4_PAGE_HEIGHT, measured));
      }
    };
    calculateDocHeight();
    editor.on('update', calculateDocHeight);
    return () => {
      editor.off('update', calculateDocHeight);
    };
  }, [editor]);

  const totalPages = Math.max(1, Math.ceil(docContentHeight / A4_PAGE_HEIGHT));

  const words = editor ? editor.storage.characterCount.words() : 0;
  const chars = editor ? editor.storage.characterCount.characters() : 0;

  const focusEditor = () => {
    if (isEditingHF) return;
    if (editor && !editor.isFocused) {
      editor.chain().focus().run();
    }
  };

  const insertPageNumber = (type = 'simple') => {
    if (type === 'page-of-pages') {
      setHeaderRight(`Page 1 of ${totalPages}`);
    } else {
      setHeaderRight('Page 1');
    }
  };

  const insertDateHF = () => {
    const d = new Date().toLocaleDateString();
    setHeaderLeft(hl => `${hl} • ${d}`);
  };

  return (
    <div className="word-suite-wrapper">
      {/* Top Office 365 Ribbon */}
      <WordRibbon
        editor={editor}
        title={title}
        onPrint={onPrint}
        onOpenTemplates={onOpenTemplates}
        words={words}
        chars={chars}
        page={page}
        setPage={setPage}
        isEditingHF={isEditingHF}
        setIsEditingHF={setIsEditingHF}
        onInsertPageNumber={insertPageNumber}
        onInsertDateHF={insertDateHF}
      />

      {/* Main Document Workspace */}
      <div className="word-workspace-body">
        {/* Left Navigation Pane */}
        {showOutline && (
          <>
            <div className="word-outline-backdrop" onClick={() => setShowOutline(false)} />
            <div className="word-outline-pane">
              <WordNavigationPane editor={editor} />
            </div>
          </>
        )}

        {/* Center Page Canvas Area */}
        <div className={`word-canvas-area ${viewMode === 'focus' ? 'word-focus-mode' : ''}`}>
          {/* Horizontal Measurement Ruler */}
          <div className="word-ruler">
            <div className="ruler-ticks">
              {Array.from({ length: 17 }, (_, i) => (
                <div key={i} className="ruler-inch">
                  <span>{i}</span>
                  <div className="ruler-subticks">
                    <span /><span /><span />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Authentic MS Word Multi-Page Canvas */}
          <div className="word-page-scroller" onClick={focusEditor}>
            <div
              ref={sheetRef}
              className={`word-page-sheet word-theme-${page.theme} word-margin-${page.margin} ${page.orientation === 'landscape' ? 'word-landscape' : ''} ${isEditingHF ? 'editing-hf-mode' : ''}`}
              style={{
                minHeight: `${totalPages * A4_PAGE_HEIGHT}px`,
                transform: `scale(${page.zoom / 100})`,
                transformOrigin: 'top center',
              }}
            >
              {/* Dynamic Page Break Lines for Multi-Page Documents */}
              {Array.from({ length: totalPages - 1 }, (_, i) => (
                <div
                  key={i}
                  className="word-page-separator"
                  style={{
                    top: `${(i + 1) * A4_PAGE_HEIGHT}px`,
                  }}
                >
                  <div className="word-page-break-line" />
                  <span className="word-page-break-badge">Page {i + 2} of {totalPages}</span>
                </div>
              ))}

              {/* 1️⃣ WORKABLE HEADER AREA */}
              <div
                className={`word-sheet-header-box ${isEditingHF ? 'active-hf' : ''}`}
                onDoubleClick={() => setIsEditingHF(true)}
                title="Double-click to edit Header"
              >
                {isEditingHF && <div className="hf-section-tag">Header - Section 1</div>}
                <div className="hf-inner-row">
                  {isEditingHF ? (
                    <input
                      className="hf-live-input left"
                      value={headerLeft}
                      onChange={e => setHeaderLeft(e.target.value)}
                      placeholder="Document title or header text..."
                    />
                  ) : (
                    <span className="hf-text-display left">{headerLeft}</span>
                  )}

                  {isEditingHF ? (
                    <input
                      className="hf-live-input right"
                      value={headerRight}
                      onChange={e => setHeaderRight(e.target.value)}
                      placeholder="Page number / Date..."
                    />
                  ) : (
                    <span className="hf-text-display right">{headerRight || `Page 1 of ${totalPages}`}</span>
                  )}
                </div>
              </div>

              {/* 2️⃣ TIPTAP DOCUMENT BODY EDITOR AREA */}
              <div
                className={`word-tiptap-wrap ${isEditingHF ? 'body-dimmed' : ''}`}
                onClick={() => { if (isEditingHF) setIsEditingHF(false); }}
              >
                <EditorContent editor={editor} />
              </div>

              {/* 3️⃣ WORKABLE FOOTER AREA */}
              <div
                className={`word-sheet-footer-box ${isEditingHF ? 'active-hf' : ''}`}
                onDoubleClick={() => setIsEditingHF(true)}
                title="Double-click to edit Footer"
              >
                {isEditingHF && <div className="hf-section-tag footer-tag">Footer - Section 1</div>}
                <div className="hf-inner-row">
                  {isEditingHF ? (
                    <input
                      className="hf-live-input left"
                      value={footerLeft}
                      onChange={e => setFooterLeft(e.target.value)}
                      placeholder="Confidential / Company name..."
                    />
                  ) : (
                    <span className="hf-text-display left">{footerLeft}</span>
                  )}

                  {isEditingHF ? (
                    <input
                      className="hf-live-input right"
                      value={footerRight}
                      onChange={e => setFooterRight(e.target.value)}
                      placeholder="Collab-Sheets Word..."
                    />
                  ) : (
                    <span className="hf-text-display right">{footerRight}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom MS Word Status Bar */}
      <div className="word-status-bar">
        <div className="wsb-left">
          <span className="wsb-item">Page 1 of {totalPages}</span>
          <span className="wsb-item">{words} words</span>
          <span className="wsb-item wsb-desktop-only">{chars} characters</span>
          <span className="wsb-item wsb-desktop-only"><SpellCheck size={13} /> English (US)</span>
          {isEditingHF && (
            <span className="badge badge-pro" style={{ marginLeft: 8, background: '#ffffff', color: '#185abd' }}>
              Header & Footer Editing
            </span>
          )}
        </div>

        <div className="wsb-right">
          {isEditingHF && (
            <button
              className="btn btn-sm"
              style={{ background: '#ffffff', color: '#185abd', fontWeight: 700, padding: '2px 10px', fontSize: 11 }}
              onClick={() => setIsEditingHF(false)}
            >
              Close Header & Footer
            </button>
          )}

          <div className="wsb-modes-wrap wsb-desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              className={`wsb-mode-btn ${showOutline ? 'active' : ''}`}
              title="Toggle Outline Navigation"
              onClick={() => setShowOutline(o => !o)}
            >
              <Layers size={13} />
            </button>
            <button
              className={`wsb-mode-btn ${viewMode === 'print' ? 'active' : ''}`}
              title="Print Layout"
              onClick={() => setViewMode('print')}
            >
              <FileText size={13} />
            </button>
            <button
              className={`wsb-mode-btn ${viewMode === 'web' ? 'active' : ''}`}
              title="Web Layout"
              onClick={() => setViewMode('web')}
            >
              <Layers size={13} />
            </button>
            <button
              className={`wsb-mode-btn ${viewMode === 'focus' ? 'active' : ''}`}
              title="Focus Mode"
              onClick={() => setViewMode(v => v === 'focus' ? 'print' : 'focus')}
            >
              <Eye size={13} />
            </button>
          </div>

          <div className="wsb-zoom-control wsb-desktop-only">
            <button className="wsb-icon-btn" onClick={() => setPage({ ...page, zoom: Math.max(50, page.zoom - 10) })}>
              <ZoomOut size={12} />
            </button>
            <input
              type="range"
              min={50}
              max={200}
              value={page.zoom}
              onChange={e => setPage({ ...page, zoom: +e.target.value })}
              className="wsb-zoom-slider"
            />
            <button className="wsb-icon-btn" onClick={() => setPage({ ...page, zoom: Math.min(200, page.zoom + 10) })}>
              <ZoomIn size={12} />
            </button>
            <span style={{ minWidth: 38, textAlign: 'right', fontSize: 11.5 }}>{page.zoom}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
