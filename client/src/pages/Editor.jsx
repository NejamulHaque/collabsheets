import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API, useAuthStore } from '../store/authStore';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Collaboration } from '@tiptap/extension-collaboration';
import { CollaborationCursor } from '@tiptap/extension-collaboration-cursor';
import { CustomTextStyle, FontFamily, FontSize } from '../extensions/FontKit';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import {
  ArrowLeft, Code2, FileText, Presentation, Maximize2,
  ChevronRight, Share2, Sheet, MessageCircle, Brush, Sparkles,
  Layers, Check,
} from 'lucide-react';

import AIPanel from '../components/AIPanel';
import RightSidebar from '../components/RightSidebar';
import VSCodeWorkspace from '../components/VSCodeWorkspace';
import WordEditor from '../components/WordEditor';
import SlidesEditor from '../components/SlidesEditor';
import SheetEditor from '../components/SheetEditor';
import Whiteboard from '../components/Whiteboard';
import TemplateModal from '../components/TemplateModal';
import ThemeToggle from '../components/ThemeToggle';
import CommandPalette from '../components/CommandPalette';
import ShareModal from '../components/ShareModal';
import NotificationsBell from '../components/NotificationsBell';
import MailMerge from '../components/MailMerge';
import CallPanel from '../components/CallPanel';
import { useThemeStore } from '../store/themeStore';
import { WS_URL as WS_BASE } from '../config';

const colors = ['#8b5cf6', '#22d3ee', '#f59e0b', '#ef4444', '#10b981', '#ec4899'];
const WS_URL = WS_BASE + '/yjs';

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [docMeta, setDocMeta] = useState(null);
  const [mode, setMode] = useState('code');
  const [title, setTitle] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [yjs, setYjs] = useState(null);
  const [saveState, setSaveState] = useState('saved');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showMailMerge, setShowMailMerge] = useState(false);
  const titleTimeout = useRef(null);

  // Word Page Settings
  const [page, setPage] = useState({ theme: 'classic', margin: 'normal', orientation: 'portrait', zoom: 100 });
  const { theme, setTheme } = useThemeStore();

  const myColor = colors[(user?.username?.length || 3) % colors.length];
  const canEdit = docMeta?.role !== 'viewer';

  // Initialize Yjs Room & Awareness
  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(WS_URL, id, ydoc);
    provider.awareness.setLocalStateField('user', { name: user?.username || 'Anonymous', color: myColor });

    const onAwarenessChange = () => {
      const states = Array.from(provider.awareness.getStates().values());
      setActiveUsers(states.filter((s) => s.user));
    };
    provider.awareness.on('change', onAwarenessChange);

    const filesMap = ydoc.getMap('files');
    const ensureDefault = () => {
      if (filesMap.size === 0) {
        ydoc.transact(() => {
          filesMap.set('main.py', new Y.Text('# Welcome to Visual Studio Code in Collab-Sheets\n\ndef greet(name: str):\n    return f"Hello, {name}!"\n\nprint(greet("World"))\n'));
        });
      }
    };
    ensureDefault();
    provider.on('sync', (isSynced) => { if (isSynced) ensureDefault(); });

    setYjs({ ydoc, provider, filesMap });

    return () => {
      provider.awareness.off('change', onAwarenessChange);
      provider.destroy();
      ydoc.destroy();
      setYjs(null);
    };
  }, [id]);

  // Load Document Metadata
  useEffect(() => {
    API.get(`/documents/${id}`)
      .then((res) => {
        setDocMeta(res.data);
        setMode(res.data.mode);
        setTitle(res.data.title);
      })
      .catch(() => navigate('/dashboard'));
  }, [id]);

  // Save State Indicator
  useEffect(() => {
    if (!yjs) return;
    let t;
    const onUpdate = () => {
      setSaveState('saving');
      clearTimeout(t);
      t = setTimeout(() => setSaveState('saved'), 2000);
    };
    yjs.ydoc.on('update', onUpdate);
    return () => {
      clearTimeout(t);
      yjs.ydoc.off('update', onUpdate);
    };
  }, [yjs]);

  // Tiptap RichText Editor configuration
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight,
      CustomTextStyle,
      FontFamily,
      FontSize,
      Color,
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table,
      TableRow,
      TableCell,
      TableHeader,
      Image,
      Link.configure({ openOnClick: false }),
      CharacterCount,
      ...(yjs ? [Collaboration.configure({ document: yjs.ydoc })] : []),
      ...(yjs ? [CollaborationCursor.configure({ provider: yjs.provider, user: { name: user?.username || 'Anonymous', color: myColor } })] : []),
    ],
  }, [yjs]);

  useEffect(() => {
    if (editor) editor.setEditable(canEdit);
  }, [editor, canEdit]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    clearTimeout(titleTimeout.current);
    titleTimeout.current = setTimeout(() => {
      API.patch(`/documents/${id}`, { title: e.target.value }).catch(console.error);
    }, 1000);
  };

  const switchMode = (m) => {
    setMode(m);
    API.patch(`/documents/${id}`, { mode: m }).catch(() => {});
  };

  const toggleFs = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  };

  const getEditorContext = () => {
    if (mode === 'code' && yjs) {
      const keys = Array.from(yjs.filesMap.keys());
      const activeText = yjs.filesMap.get(keys[0] || 'main.py');
      return activeText?.toString() || '';
    }
    if (mode === 'richtext' && editor) return editor.getText() || editor.getHTML();
    if (mode === 'sheets' && yjs) {
      const sheet = yjs.ydoc.getMap('cells');
      return JSON.stringify(sheet.toJSON());
    }
    if (mode === 'slides' && yjs) {
      const slides = yjs.ydoc.getArray('slides');
      return JSON.stringify(slides.toJSON());
    }
    return '';
  };

  const insertAIContent = (text) => {
    if (!canEdit) return alert('You have view-only access to this document.');
    if (mode === 'code' && yjs) {
      const keys = Array.from(yjs.filesMap.keys());
      const firstKey = keys[0] || 'main.py';
      const t = yjs.filesMap.get(firstKey);
      if (t) {
        // Strip markdown backtick fences if pure code was generated
        const codeMatch = text.match(/```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/);
        const codeToInsert = codeMatch ? codeMatch[1].trim() : text;
        t.insert(t.length, '\n\n' + codeToInsert);
      }
    } else if (mode === 'richtext' && editor) {
      editor.commands.insertContent(`<p>${text.replace(/\n/g, '<br/>')}</p>`);
    } else if (mode === 'slides' && yjs) {
      const slides = yjs.ydoc.getArray('slides');
      const m = new Y.Map();
      m.set('title', 'AI Generated Slide');
      m.set('body', text);
      m.set('theme', 0);
      m.set('layout', 'title-content');
      slides.push([m]);
    } else if (mode === 'whiteboard' && yjs) {
      const elements = yjs.ydoc.getArray('elements');
      elements.push([{
        id: 'sticky-' + Date.now(),
        type: 'sticky',
        text: text.slice(0, 120),
        color: '#fef3c7',
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        w: 180,
        h: 120,
      }]);
    }
  };

  const commands = [
    { label: 'Switch to Visual Studio Code', icon: <Code2 size={14} />, run: () => switchMode('code') },
    { label: 'Switch to Microsoft Word', icon: <FileText size={14} />, run: () => switchMode('richtext') },
    { label: 'Switch to Microsoft Excel', icon: <Sheet size={14} />, run: () => switchMode('sheets') },
    { label: 'Switch to Microsoft PowerPoint', icon: <Presentation size={14} />, run: () => switchMode('slides') },
    { label: 'Switch to Whiteboard', icon: <Brush size={14} />, run: () => switchMode('whiteboard') },
    { label: 'Share Document', icon: <Share2 size={14} />, run: () => setShowShare(true) },
    { label: 'Print Document', icon: <FileText size={14} />, run: () => window.print() },
    { label: 'Toggle Fullscreen', icon: <Maximize2 size={14} />, run: toggleFs },
  ];

  if (!docMeta) return <div style={{ padding: '60px', textAlign: 'center' }}>⌘ Loading Collab-Sheets Suite…</div>;

  return (
    <div className="office-suite-app">
      {/* 1️⃣ TOP GLOBAL SUITE HEADER */}
      <header className="office-top-header">
        <button className="office-back-btn" title="Dashboard" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={18} />
        </button>

        <div className="office-title-box">
          <input
            className="office-title-input"
            value={title}
            onChange={handleTitleChange}
            placeholder="Document Name"
          />
          <div className="office-save-pill">
            <span className={`save-dot ${saveState}`} />
            <span>{saveState === 'saved' ? 'Saved to Cloud' : 'Saving...'}</span>
          </div>
        </div>

        {/* Realtime Live Avatars */}
        <div className="office-presence-rail">
          {activeUsers.map((u, i) => (
            <div
              key={i}
              title={u.user?.name}
              className="office-avatar"
              style={{
                background: u.user?.color || '#8b5cf6',
                marginLeft: i === 0 ? 0 : '-8px',
              }}
            >
              {u.user?.name?.charAt(0).toUpperCase()}
            </div>
          ))}
          <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 6 }}>
            {activeUsers.length} online
          </span>
        </div>

        {/* 2️⃣ MODERN SUITE APP SELECTOR (VS CODE / WORD / EXCEL / PPT / BOARD) */}
        <div className="office-app-switcher">
          <button
            className={`app-switch-pill vscode-pill ${mode === 'code' ? 'active' : ''}`}
            onClick={() => switchMode('code')}
            title="Visual Studio Code"
          >
            <Code2 size={15} />
            <span>VS Code</span>
          </button>

          <button
            className={`app-switch-pill word-pill ${mode === 'richtext' ? 'active' : ''}`}
            onClick={() => switchMode('richtext')}
            title="Microsoft Word"
          >
            <FileText size={15} />
            <span>Word</span>
          </button>

          <button
            className={`app-switch-pill excel-pill ${mode === 'sheets' ? 'active' : ''}`}
            onClick={() => switchMode('sheets')}
            title="Microsoft Excel"
          >
            <Sheet size={15} />
            <span>Excel</span>
          </button>

          <button
            className={`app-switch-pill ppt-pill ${mode === 'slides' ? 'active' : ''}`}
            onClick={() => switchMode('slides')}
            title="Microsoft PowerPoint"
          >
            <Presentation size={15} />
            <span>PowerPoint</span>
          </button>

          <button
            className={`app-switch-pill board-pill ${mode === 'whiteboard' ? 'active' : ''}`}
            onClick={() => switchMode('whiteboard')}
            title="Interactive Whiteboard"
          >
            <Brush size={15} />
            <span>Board</span>
          </button>
        </div>

        {/* Header Right Utility Controls */}
        <div className="office-header-right">
          <button
            className="btn btn-ghost btn-icon"
            title="Team Chat"
            onClick={() => window.dispatchEvent(new CustomEvent('cs-open-chat'))}
          >
            <MessageCircle size={16} />
          </button>
          <button
            className="btn btn-ghost btn-icon"
            title="Share Document"
            onClick={() => setShowShare(true)}
          >
            <Share2 size={16} />
          </button>
          <NotificationsBell />
          <ThemeToggle />
          <button
            className="btn btn-ghost btn-icon"
            title="Toggle Fullscreen"
            onClick={toggleFs}
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </header>

      {/* 3️⃣ ACTIVE SUITE APP WORKSPACE */}
      <main className="office-workspace-canvas">
        {mode === 'code' && yjs && (
          <VSCodeWorkspace
            ydoc={yjs.ydoc}
            provider={yjs.provider}
            docId={id}
            readOnly={!canEdit}
            activeUsers={activeUsers}
            saveState={saveState}
          />
        )}

        {mode === 'richtext' && (
          <WordEditor
            editor={editor}
            title={title}
            canEdit={canEdit}
            page={page}
            setPage={setPage}
            onOpenTemplates={() => setShowTemplates(true)}
            onPrint={() => window.print()}
          />
        )}

        {mode === 'sheets' && yjs && (
          <SheetEditor
            ydoc={yjs.ydoc}
            readOnly={!canEdit}
          />
        )}

        {mode === 'slides' && yjs && (
          <SlidesEditor
            ydoc={yjs.ydoc}
            docId={id}
            readOnly={!canEdit}
          />
        )}

        {mode === 'whiteboard' && yjs && (
          <Whiteboard
            ydoc={yjs.ydoc}
            readOnly={!canEdit}
          />
        )}
      </main>

      {/* Floating Sidebars & Tools */}
      <RightSidebar docId={id} onRestore={() => window.location.reload()} />
      <CallPanel docId={id} provider={yjs?.provider} />
      <CommandPalette commands={commands} />
      <AIPanel getContext={getEditorContext} onInsert={insertAIContent} mode={mode} />

      {showTemplates && <TemplateModal editor={editor} onClose={() => setShowTemplates(false)} />}
      {showShare && <ShareModal docId={id} onClose={() => setShowShare(false)} />}
      {showMailMerge && <MailMerge editor={editor} onClose={() => setShowMailMerge(false)} />}
    </div>
  );
}