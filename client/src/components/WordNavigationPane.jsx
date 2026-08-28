import { useEffect, useState } from 'react';
import { ListTree, FileText, Search, ChevronRight, Hash } from 'lucide-react';

export default function WordNavigationPane({ editor }) {
  const [tab, setTab] = useState('headings'); // 'headings', 'pages', 'search'
  const [headings, setHeadings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (!editor) return;
    const extract = () => {
      const hList = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          hList.push({
            level: node.attrs.level,
            text: node.textContent || '(Untitled Heading)',
            pos,
          });
        }
      });
      setHeadings(hList);
    };
    extract();
    editor.on('update', extract);
    return () => { editor.off('update', extract); };
  }, [editor]);

  const handleSearch = (q) => {
    setSearchQuery(q);
    if (!q.trim() || !editor) {
      setSearchResults([]);
      return;
    }
    const text = editor.getText();
    const results = [];
    const lowerText = text.toLowerCase();
    const lowerQ = q.toLowerCase();
    let idx = lowerText.indexOf(lowerQ);
    let count = 0;
    while (idx !== -1 && count < 20) {
      const snippetStart = Math.max(0, idx - 15);
      const snippetEnd = Math.min(text.length, idx + q.length + 25);
      results.push({
        snippet: text.slice(snippetStart, snippetEnd),
        index: idx,
      });
      idx = lowerText.indexOf(lowerQ, idx + 1);
      count++;
    }
    setSearchResults(results);
  };

  const jumpToHeading = (pos) => {
    if (!editor) return;
    editor.chain().focus().setTextSelection(pos + 1).scrollIntoView().run();
  };

  if (!editor) return null;

  return (
    <div className="word-nav-pane">
      <div className="word-nav-header">
        <span style={{ fontWeight: 700, fontSize: 12 }}>Navigation</span>
      </div>

      {/* Tabs */}
      <div className="word-nav-tabs">
        <button
          className={`word-nav-tab ${tab === 'headings' ? 'active' : ''}`}
          onClick={() => setTab('headings')}
        >
          <ListTree size={13} />
          <span>Headings</span>
        </button>
        <button
          className={`word-nav-tab ${tab === 'pages' ? 'active' : ''}`}
          onClick={() => setTab('pages')}
        >
          <FileText size={13} />
          <span>Pages</span>
        </button>
        <button
          className={`word-nav-tab ${tab === 'search' ? 'active' : ''}`}
          onClick={() => setTab('search')}
        >
          <Search size={13} />
          <span>Search</span>
        </button>
      </div>

      {/* Content */}
      <div className="word-nav-body">
        {tab === 'headings' && (
          <div className="word-nav-list">
            {headings.length === 0 ? (
              <div className="word-nav-empty">
                <Hash size={24} style={{ opacity: 0.4, margin: '0 auto 6px' }} />
                <span>No headings yet</span>
                <small style={{ color: 'var(--muted)', fontSize: 11 }}>Add Heading 1 or Heading 2 to organize your document.</small>
              </div>
            ) : (
              headings.map((h, i) => (
                <button
                  key={i}
                  className={`word-nav-heading-item lvl-${h.level}`}
                  style={{ paddingLeft: `${8 + (h.level - 1) * 12}px` }}
                  onClick={() => jumpToHeading(h.pos)}
                >
                  <ChevronRight size={12} style={{ opacity: 0.5 }} />
                  <span className="heading-text">{h.text}</span>
                </button>
              ))
            )}
          </div>
        )}

        {tab === 'pages' && (
          <div className="word-nav-pages-list">
            <div className="word-page-thumb-card active">
              <div className="thumb-preview">
                <div className="thumb-lines">
                  <span style={{ width: '70%' }} />
                  <span style={{ width: '90%' }} />
                  <span style={{ width: '85%' }} />
                  <span style={{ width: '60%' }} />
                </div>
              </div>
              <span className="thumb-label">Page 1</span>
            </div>
          </div>
        )}

        {tab === 'search' && (
          <div className="word-nav-search-wrap">
            <div className="word-search-input-box">
              <Search size={14} style={{ color: 'var(--muted)' }} />
              <input
                placeholder="Search document…"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                className="word-search-input"
              />
            </div>

            <div className="word-search-results">
              {searchQuery && searchResults.length === 0 && (
                <div className="word-nav-empty">No matching text found</div>
              )}
              {searchResults.map((r, i) => (
                <div key={i} className="word-search-result-item">
                  <span>…{r.snippet}…</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
