import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API, useAuthStore } from '../store/authStore';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { createTheme } from '@uiw/codemirror-themes';
import { tags as t } from '@lezer/highlight';
import { languages } from '@codemirror/language-data';
import { LanguageDescription, LanguageSupport } from '@codemirror/language';
import { EditorView, highlightActiveLine } from '@codemirror/view';
import { bracketMatching } from '@codemirror/language';
import { openSearchPanel } from '@codemirror/search';
import { useEditor, EditorContent } from '@tiptap/react';
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
import { todoHighlight } from '../extensions/todoHighlight';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { yCollab } from 'y-codemirror.next';
import {
  ArrowLeft, Code2, FileText, Users, Presentation, Maximize2,
  ChevronRight, Play, Sun, Share2, Sheet, MessageCircle, Bug, Puzzle, Brush,
} from 'lucide-react';

import AIPanel from '../components/AIPanel';
import RightSidebar from '../components/RightSidebar';
import WordRibbon from '../components/WordRibbon';
import RunPanel from '../components/RunPanel';
import SlidesEditor from '../components/SlidesEditor';
import SheetEditor from '../components/SheetEditor';
import Whiteboard from '../components/Whiteboard';
import FileTree from '../components/FileTree';
import FileTabs from '../components/FileTabs';
import StatusBar from '../components/StatusBar';
import CodeSnippets from '../components/CodeSnippets';
import TemplateModal from '../components/TemplateModal';
import ThemeToggle from '../components/ThemeToggle';
import CommandPalette from '../components/CommandPalette';
import OutlinePanel from '../components/OutlinePanel';
import ShareModal from '../components/ShareModal';
import MenuBar from '../components/MenuBar';
import NotificationsBell from '../components/NotificationsBell';
import Minimap from '../components/Minimap';
import { useThemeStore } from '../store/themeStore';
import { autocomplete } from '../components/Autocomplete';
import { reviewCode } from '../components/reviewCode';
import MailMerge from '../components/MailMerge';
import { breakpointsExt, getBreakpointLines } from '../components/Breakpoints';
import DebugModal from '../components/DebugModal';
import GitPanel from '../components/GitPanel';
import ExtensionsModal from '../components/ExtensionsModal';
import CallPanel from '../components/CallPanel';
import { WS_URL as WS_BASE } from '../config';

const colors = ['#8b5cf6', '#22d3ee', '#f59e0b', '#ef4444', '#10b981', '#ec4899'];
const WS_URL = WS_BASE + '/yjs';
const FALLBACK_LANGS = ['python','javascript','typescript','java','c','c++','go','rust','php','ruby','swift','kotlin','dart','haskell','scala','perl','lua','bash','sql','html','css','json','markdown','yaml','xml','r','julia','elixir','erlang','clojure','cobol','nim','ocaml','groovy','solidity','assembly','d','vb','f#'];
const EXT_MAP = {
  py: 'python', js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  c: 'c', h: 'c', cpp: 'c++', cc: 'c++', hpp: 'c++', java: 'java', rs: 'rust', go: 'go',
  rb: 'ruby', php: 'php', cs: 'c#', kt: 'kotlin', swift: 'swift', dart: 'dart', sh: 'bash',
  sql: 'sql', html: 'html', css: 'css', json: 'json', md: 'markdown', yml: 'yaml', yaml: 'yaml',
  xml: 'xml', r: 'r', jl: 'julia', lua: 'lua', pl: 'perl', scala: 'scala', hs: 'haskell',
};

const monokaiTheme = createTheme({
  theme: 'dark',
  settings: { background: '#272822', foreground: '#f8f8f2', caret: '#f8f8f0', selection: '#49483e', lineHighlight: '#3e3d32', gutterBackground: '#272822', gutterForeground: '#90908a' },
  styles: [
    { tag: t.keyword, color: '#f92672' }, { tag: t.string, color: '#e6db74' }, { tag: t.number, color: '#ae81ff' },
    { tag: t.comment, color: '#75715e' }, { tag: t.function(t.variableName), color: '#a6e22e' }, { tag: t.typeName, color: '#66d9ef' },
    { tag: t.operator, color: '#f92672' }, { tag: t.variableName, color: '#f8f8f2' },
  ],
});

const draculaTheme = createTheme({
  theme: 'dark',
  settings: { background: '#282a36', foreground: '#f8f8f2', caret: '#f8f8f2', selection: '#44475a', lineHighlight: '#343746', gutterBackground: '#282a36', gutterForeground: '#6272a4' },
  styles: [
    { tag: t.keyword, color: '#ff79c6' }, { tag: t.string, color: '#f1fa8c' }, { tag: t.number, color: '#bd93f9' },
    { tag: t.comment, color: '#6272a4' }, { tag: t.function(t.variableName), color: '#50fa7b' }, { tag: t.typeName, color: '#8be9fd' },
    { tag: t.operator, color: '#ff79c6' }, { tag: t.variableName, color: '#f8f8f2' },
  ],
});

const EDITOR_THEMES = { 'One Dark': oneDark, 'Monokai': monokaiTheme, 'Dracula': draculaTheme };

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
  const titleTimeout = useRef(null);
  const [filesList, setFilesList] = useState([]);
  const [activeFile, setActiveFile] = useState('main.py');
  const [codeLang, setCodeLang] = useState('python');
  const [langSupport, setLangSupport] = useState(null);
  const [runtimes, setRuntimes] = useState([]);
  const { theme, setTheme } = useThemeStore();
  const [showMailMerge, setShowMailMerge] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [review, setReview] = useState([]);
  const [customThemes, setCustomThemes] = useState(() => { try { return JSON.parse(localStorage.getItem('cs-themes') || '{}'); } catch { return {}; } });
  const [exts, setExts] = useState(() => { try { return JSON.parse(localStorage.getItem('cs-exts') || '{}'); } catch { return {}; } });
  const [showExts, setShowExts] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debug, setDebug] = useState(null);
  const [page, setPage] = useState({ theme: 'classic', margin: 'normal', orientation: 'portrait', zoom: 100 });
  const [cmView, setCmView] = useState(null);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [wrap, setWrap] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [themeName, setThemeName] = useState('One Dark');
  const [showMinimap, setShowMinimap] = useState(true);

  const myColor = colors[(user?.username?.length || 3) % colors.length];
  const langOptions = runtimes.length ? [...new Set(runtimes.map(r => r.language))].sort() : FALLBACK_LANGS;
  const canEdit = docMeta?.role !== 'viewer';

  const builtCustom = Object.fromEntries(Object.entries(customThemes).map(([name, c]) => [name, createTheme({
    theme: 'dark',
    settings: { background: c.background || '#1e1e1e', foreground: c.foreground || '#eee', caret: c.foreground || '#fff', selection: c.selection || '#333', lineHighlight: c.lineHighlight || '#2a2a2a', gutterBackground: c.background || '#1e1e1e', gutterForeground: '#888' },
    styles: [
      { tag: t.keyword, color: c.keyword || '#569cd6' }, { tag: t.string, color: c.string || '#ce9178' },
      { tag: t.number, color: c.number || '#b5cea8' }, { tag: t.comment, color: c.comment || '#6a9955' },
      { tag: t.function(t.variableName), color: c.function || '#dcdcaa' }, { tag: t.typeName, color: c.type || '#4ec9b0' },
    ],
  })]));
  const ALL_THEMES = { ...EDITOR_THEMES, ...builtCustom };

  const importTheme = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const j = JSON.parse(r.result);
        const next = { ...customThemes, [j.name || 'My Theme']: j };
        setCustomThemes(next); localStorage.setItem('cs-themes', JSON.stringify(next));
        setThemeName(j.name || 'My Theme');
      } catch { alert('Invalid theme JSON'); }
    };
    r.readAsText(f);
  };

  useEffect(() => { if (user?.theme) useThemeStore.getState().init(user.theme); }, [user?.theme]);
  useEffect(() => { API.get('/execute/runtimes').then(r => setRuntimes(r.data || [])).catch(() => {}); }, []);

  useEffect(() => {
    let cancelled = false;
    const desc = LanguageDescription.matchLanguageName(languages, codeLang, true);
    if (!desc) { setLangSupport(null); return; }
    desc.load().then(lang => { if (!cancelled) setLangSupport(new LanguageSupport(lang)); }).catch(() => setLangSupport(null));
    return () => { cancelled = true; };
  }, [codeLang]);

  useEffect(() => {
    const ext = activeFile.split('.').pop().toLowerCase();
    if (EXT_MAP[ext]) setCodeLang(EXT_MAP[ext]);
  }, [activeFile]);

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
        ydoc.transact(() => filesMap.set('main.py', new Y.Text('# Welcome to CollabSheets\nprint("Hello World")')));
      }
    };
    ensureDefault();
    provider.on('sync', (isSynced) => { if (isSynced) ensureDefault(); });
    const updateFiles = () => setFilesList(Array.from(filesMap.keys()));
    filesMap.observe(updateFiles);
    updateFiles();
    setYjs({ ydoc, provider, filesMap });
    return () => {
      filesMap.unobserve(updateFiles);
      provider.awareness.off('change', onAwarenessChange);
      provider.destroy();
      ydoc.destroy();
      setYjs(null);
    };
  }, [id]);

  useEffect(() => {
    API.get(`/documents/${id}`)
      .then((res) => { setDocMeta(res.data); setMode(res.data.mode); setTitle(res.data.title); })
      .catch(() => navigate('/dashboard'));
  }, [id]);

  useEffect(() => {
    if (!yjs) return;
    let t;
    const onUpdate = () => { setSaveState('saving'); clearTimeout(t); t = setTimeout(() => setSaveState('saved'), 2500); };
    yjs.ydoc.on('update', onUpdate);
    return () => { clearTimeout(t); yjs.ydoc.off('update', onUpdate); };
  }, [yjs]);

  useEffect(() => {
    if (yjs && !yjs.filesMap.has(activeFile)) {
      yjs.ydoc.transact(() => yjs.filesMap.set(activeFile, new Y.Text('')));
    }
  }, [yjs, activeFile]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }), Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight, CustomTextStyle, FontFamily, FontSize, Color, Subscript, Superscript,
      TaskList, TaskItem.configure({ nested: true }),
      Table, TableRow, TableCell, TableHeader, Image, Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start writing your document…' }), CharacterCount,
      ...(yjs ? [Collaboration.configure({ document: yjs.ydoc })] : []),
      ...(yjs ? [CollaborationCursor.configure({ provider: yjs.provider, user: { name: user?.username || 'Anonymous', color: myColor } })] : []),
    ],
  }, [yjs]);

  const getActiveYText = () => yjs?.filesMap.get(activeFile);
  const getText = () => getActiveYText()?.toString() || '';

  const codemirrorExtensions = useMemo(() => {
    const activeText = yjs?.filesMap.get(activeFile);
    return yjs ? [
      EditorView.updateListener.of((u) => {
        if (u.selectionSet || u.docChanged) {
          const l = u.state.doc.lineAt(u.state.selection.main.head);
          setCursor({ line: l.number, col: u.state.selection.main.head - l.from + 1 });
        }
      }),
      ...(wrap ? [EditorView.lineWrapping] : []),
      EditorView.theme({ '&': { fontSize: fontSize + 'px' } }),
      ...(langSupport ? [langSupport] : []),
      ...autocomplete(),
      ...breakpointsExt,
      ...(exts['active-line'] ? [highlightActiveLine()] : []),
      ...(exts['brackets'] ? [bracketMatching()] : []),
      ...(exts['todo'] ? [todoHighlight] : []),
      ...(activeText ? [yCollab(activeText, yjs.provider.awareness)] : []),
    ] : [
      ...(wrap ? [EditorView.lineWrapping] : []),
      EditorView.theme({ '&': { fontSize: fontSize + 'px' } }),
      ...(langSupport ? [langSupport] : []),
      ...autocomplete(),
      ...breakpointsExt,
      ...(exts['active-line'] ? [highlightActiveLine()] : []),
      ...(exts['brackets'] ? [bracketMatching()] : []),
      ...(exts['todo'] ? [todoHighlight] : []),
    ];
  }, [yjs, activeFile, langSupport, wrap, fontSize, exts]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    clearTimeout(titleTimeout.current);
    titleTimeout.current = setTimeout(() => API.patch(`/documents/${id}`, { title: e.target.value }).catch(console.error), 1000);
  };

  const switchMode = (m) => { setMode(m); API.patch(`/documents/${id}`, { mode: m }).catch(() => {}); };

  const addFile = () => {
    const name = prompt("File name (e.g., utils.py):");
    if (name && yjs && !yjs.filesMap.has(name)) {
      yjs.ydoc.transact(() => yjs.filesMap.set(name, new Y.Text('')));
      setActiveFile(name);
    }
  };

  const deleteFile = (name) => {
    if (!yjs || yjs.filesMap.size <= 1) return alert("You must have at least one file.");
    if (confirm(`Delete ${name}?`)) {
      yjs.ydoc.transact(() => yjs.filesMap.delete(name));
      setActiveFile(Array.from(yjs.filesMap.keys())[0]);
    }
  };

  const renameFile = (oldName, newName) => {
    if (newName && !yjs.filesMap.has(newName)) {
      const text = yjs.filesMap.get(oldName);
      yjs.ydoc.transact(() => {
        yjs.filesMap.delete(oldName);
        yjs.filesMap.set(newName, text);
      });
      if (activeFile === oldName) setActiveFile(newName);
    }
  };

  const resetFile = () => {
    if (!yjs) return;
    const t = getActiveYText();
    if (!t) return;
    if (confirm(`Clear ALL content of ${activeFile} on every device?`)) {
      yjs.ydoc.transact(() => t.delete(0, t.length));
    }
  };

  const setFileContent = (name, text) => {
    const t = yjs?.filesMap.get(name);
    if (t) yjs.ydoc.transact(() => { t.delete(0, t.length); t.insert(0, text); });
  };

  const insertSnippet = (code) => getActiveYText()?.insert(getText().length, '\n' + code);

  const getEditorContext = () => {
    if (mode === 'code' && yjs) return getText();
    if (mode === 'richtext' && editor) return editor.getHTML();
    return '';
  };

  const insertAIContent = (text) => {
    if (!canEdit) return alert('You have view-only access to this document.');
    if (mode === 'code' && yjs) getActiveYText()?.insert(getText().length, '\n\n' + text);
    else if (editor) editor.commands.insertContent(text);
  };

  const exportDoc = () => {
    if (!editor) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(
      [`<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body>${editor.getHTML()}</body></html>`],
      { type: 'application/msword' }
    ));
    a.download = `${title || 'document'}.doc`;
    a.click();
  };

  const saveVersion = () => API.post(`/documents/${id}/versions`, { title: prompt('Version name:') || 'Manual snapshot' }).then(() => alert('Version saved ✓'));

  const exportCode = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([getText()], { type: 'text/plain' }));
    a.download = activeFile || 'code.txt';
    a.click();
  };

  const runCode = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }));

  const jumpToLine = (n) => {
    if (cmView) {
      const line = cmView.state.doc.line(Math.min(n, cmView.state.doc.lines));
      cmView.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
      cmView.focus();
    }
  };

  const gotoLine = () => {
    const n = parseInt(prompt('Go to line:'));
    if (n) jumpToLine(n);
  };

  const selectAllCode = () => cmView && cmView.dispatch({ selection: { anchor: 0, head: cmView.state.doc.length } });
  const toggleFs = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const addComment = () => {
    let quote = '', line = null;
    if (mode === 'code' && cmView) {
      const { from, to } = cmView.state.selection.main;
      quote = cmView.state.sliceDoc(from, to) || cmView.state.doc.lineAt(from).text;
      line = cmView.state.doc.lineAt(from).number;
    } else if (editor) {
      const { from, to } = editor.state.selection;
      quote = editor.state.doc.textBetween(from, to, ' ');
    }
    window.dispatchEvent(new CustomEvent('cs-add-comment', { detail: { quote, line } }));
  };

  const debugRun = async () => {
    if (!cmView) return;
    const bps = getBreakpointLines(cmView);
    if (!bps.length) return alert('Click the LEFT GUTTER next to a line number to set a breakpoint first.');
    const code = getText().split('\n');
    [...bps].sort((a, b) => b - a).forEach(n => {
      if (n <= code.length) code.splice(n, 0, `print("__DBG__", ${n}, {k: v for k, v in list(locals().items()) if not k.startswith('__') and k != 'print'})`);
    });
    try {
      const { data } = await API.post('/execute', { language: 'python', code: code.join('\n'), stdin: '', documentId: id });
      const lines = (data.run?.stdout || '').split('\n');
      const stops = [], normal = [];
      lines.forEach(l => {
        if (l.startsWith('__DBG__')) {
          const m = l.match(/^__DBG__ (\d+) (.*)$/);
          if (m) {
            let vars = {};
            try { vars = JSON.parse(m[2].replace(/True/g, 'true').replace(/False/g, 'false').replace(/None/g, 'null').replace(/'/g, '"')); } catch { vars = { snapshot: m[2] }; }
            stops.push({ line: +m[1], vars });
          }
        } else normal.push(l);
      });
      setDebug({ stops, stdout: normal.join('\n'), stderr: data.run?.stderr || '' });
      setShowDebug(true);
    } catch (e) { alert('Debug run failed: ' + (e.response?.data?.error || e.message)); }
  };

  const toggleExt = (eid) => {
    const next = { ...exts, [eid]: !exts[eid] };
    setExts(next); localStorage.setItem('cs-exts', JSON.stringify(next));
  };

  const wordCount = getText().trim() ? getText().trim().split(/\s+/).length : 0;

  const menus = mode === 'code' ? [
    { name: 'File', items: [['New File', addFile], ['Reset File Content', resetFile], ['Save Version', saveVersion], ['Export Code', exportCode], ['Share', () => setShowShare(true)]] },
    { name: 'Edit', items: [['Find & Replace', () => cmView && openSearchPanel(cmView)], ['Select All', selectAllCode]] },
    { name: 'Go', items: [['Go to Line…', gotoLine]] },
    { name: 'Run', items: [['Run Code (Ctrl+Enter)', runCode], ['🐛 Debug Run (Python)', debugRun]] },
    {
      name: 'View', items: [
        [`Word Wrap: ${wrap ? 'On' : 'Off'}`, () => setWrap(w => !w)],
        ['Increase Font Size', () => setFontSize(s => Math.min(24, s + 1))],
        ['Decrease Font Size', () => setFontSize(s => Math.max(10, s - 1))],
        [`Minimap: ${showMinimap ? 'On' : 'Off'}`, () => setShowMinimap(m => !m)],
        ...Object.keys(ALL_THEMES).map(n => [`Editor Theme: ${n}`, () => setThemeName(n)]),
        ['Import Theme (.json)', () => document.getElementById('theme-import')?.click()],
        ['📦 Extensions…', () => setShowExts(true)],
        ['Toggle App Theme', toggleTheme],
        ['Fullscreen', toggleFs],
      ],
    },
    { name: 'Help', items: [['Keyboard Shortcuts', () => alert('Ctrl+Enter — Run code\nCtrl+K — Command Palette\nCtrl+F — Find & Replace\nTab — Accept autocomplete\nClick gutter — Breakpoint')]] },
  ] : [
    { name: 'File', items: [['Save Version', saveVersion], ['Share', () => setShowShare(true)], ['Export / Print', () => window.print()]] },
    { name: 'View', items: [['📦 Extensions…', () => setShowExts(true)], ['Toggle App Theme', toggleTheme], ['Fullscreen', toggleFs]] },
    { name: 'Help', items: [['Keyboard Shortcuts', () => alert('Ctrl+K — Command Palette')]] },
  ];

  const commands = [
    { label: 'Switch to Code', icon: <Code2 size={14} />, run: () => switchMode('code') },
    { label: 'Switch to Document', icon: <FileText size={14} />, run: () => switchMode('richtext') },
    { label: 'Switch to Slides', icon: <Presentation size={14} />, run: () => switchMode('slides') },
    { label: 'Switch to Sheet', icon: <Sheet size={14} />, run: () => switchMode('sheets') },
    { label: 'Switch to Whiteboard', icon: <Brush size={14} />, run: () => switchMode('whiteboard') },
    { label: 'Run code', hint: 'Ctrl+Enter', icon: <Play size={14} />, run: runCode },
    { label: 'Debug run', icon: <Bug size={14} />, run: debugRun },
    { label: 'New file', icon: <Code2 size={14} />, run: addFile },
    { label: 'Reset file content', icon: <Code2 size={14} />, run: resetFile },
    { label: 'AI Code Review', icon: <Code2 size={14} />, run: () => { setReview(reviewCode(getText(), codeLang)); setShowReview(true); } },
    { label: 'Mail Merge', icon: <FileText size={14} />, run: () => setShowMailMerge(true) },
    { label: 'Extensions marketplace', icon: <Puzzle size={14} />, run: () => setShowExts(true) },
    { label: 'Add comment', icon: <MessageCircle size={14} />, run: addComment },
    { label: 'Open team chat', icon: <MessageCircle size={14} />, run: () => window.dispatchEvent(new CustomEvent('cs-open-chat')) },
    { label: 'Share document', icon: <Share2 size={14} />, run: () => setShowShare(true) },
    { label: 'Export .doc', icon: <FileText size={14} />, run: exportDoc },
    { label: 'Print / PDF', icon: <FileText size={14} />, run: () => window.print() },
    { label: 'Toggle theme', icon: <Sun size={14} />, run: toggleTheme },
    { label: 'Toggle fullscreen', icon: <Maximize2 size={14} />, run: toggleFs },
    { label: 'Go to Dashboard', icon: <ArrowLeft size={14} />, run: () => navigate('/dashboard') },
  ];

  useEffect(() => { if (editor) editor.setEditable(canEdit); }, [editor, canEdit]);

  if (!docMeta) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading sheet...</div>;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="glass editor-header" style={{ padding: '12px 24px', borderRadius: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button className="btn btn-ghost" style={{ padding: '8px' }} onClick={() => navigate('/dashboard')}><ArrowLeft size={20} /></button>
        <input className="doc-title" value={title} onChange={handleTitleChange} style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '18px', fontWeight: 'bold', outline: 'none', flex: 1 }} />
        <span style={{ color: saveState === 'saved' ? 'var(--success)' : 'var(--warning)', fontSize: 13, fontWeight: 600 }}>
          {saveState === 'saved' ? 'Saved ✓' : 'Saving…'}
        </span>
        <div className="presence-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', marginRight: '10px' }}>
            {activeUsers.map((u, i) => (
              <div key={i} title={u.user?.name} style={{
                width: '30px', height: '30px', borderRadius: '50%', background: u.user?.color || '#8b5cf6',
                border: '2px solid var(--bg)', marginLeft: i === 0 ? 0 : '-10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 'bold', color: 'white',
              }}>
                {u.user?.name?.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
          <Users size={16} style={{ color: 'var(--muted)' }} />
          <span style={{ color: 'var(--muted)', fontSize: '14px' }}>{activeUsers.length} online</span>
        </div>
        <div className="glass mode-toggle" style={{ display: 'flex', padding: '4px', gap: '4px' }}>
          <button className={`btn ${mode === 'code' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => switchMode('code')}><Code2 size={14} /> <span className="btn-label">Code</span></button>
          <button className={`btn ${mode === 'richtext' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => switchMode('richtext')}><FileText size={14} /> <span className="btn-label">Doc</span></button>
          <button className={`btn ${mode === 'slides' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => switchMode('slides')}><Presentation size={14} /> <span className="btn-label">Slides</span></button>
          <button className={`btn ${mode === 'sheets' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => switchMode('sheets')}><Sheet size={14} /> <span className="btn-label">Sheet</span></button>
          <button className={`btn ${mode === 'whiteboard' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => switchMode('whiteboard')}><Brush size={14} /> <span className="btn-label">Board</span></button>
        </div>
        {/* ✅ Header chat button — opens the chat sidebar */}
        <button className="btn btn-ghost btn-icon" title="Team Chat"
          onClick={() => window.dispatchEvent(new CustomEvent('cs-open-chat'))}>
          <MessageCircle size={16} />
        </button>
        <button className="btn btn-ghost btn-icon" title="Share" onClick={() => setShowShare(true)}><Share2 size={16} /></button>
        <NotificationsBell />
        <ThemeToggle />
        <button className="btn btn-ghost btn-icon" title="Fullscreen" onClick={toggleFs}><Maximize2 size={16} /></button>
      </header>

      <MenuBar menus={menus} />

      <div className="breadcrumbs">
        <button onClick={() => navigate('/dashboard')}>Dashboard</button>
        <ChevronRight size={12} />
        <span>{title || 'Untitled'}</span>
        <ChevronRight size={12} />
        <span className="crumb-active">{mode === 'code' ? 'Code' : mode === 'richtext' ? 'Document' : mode === 'slides' ? 'Slides' : mode === 'sheets' ? 'Sheet' : 'Whiteboard'}{!canEdit ? ' (view only)' : ''}</span>
      </div>

      <div className="editor-body">
        <main className="editor-canvas">
          {mode === 'code' && yjs && (
            <div className="code-workspace">
              {!exts.zen && (
                <div className="code-side-panels">
                  <FileTree files={filesList.map(f => ({ id: f, name: f }))} activeFile={activeFile} onSelect={setActiveFile} onAdd={addFile} onDelete={deleteFile} onRename={renameFile} />
                  <CodeSnippets language={codeLang} onInsert={insertSnippet} />
                </div>
              )}
              <div className="code-main">
                <FileTabs files={filesList} active={activeFile} onSelect={setActiveFile} onSearch={() => cmView && openSearchPanel(cmView)} />
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                  <div className="glass" style={{ flex: 1, overflow: 'auto', borderRadius: 0 }}>
                    <CodeMirror
                      key={activeFile}
                      height="100%"
                      theme={ALL_THEMES[themeName] || oneDark}
                      extensions={codemirrorExtensions}
                      style={{ height: '100%' }}
                      editable={canEdit}
                      onCreateEditor={(view) => setCmView(view)}
                    />
                  </div>
                  {showMinimap && !exts.zen && <Minimap code={getText()} onJump={jumpToLine} />}
                </div>
                <RunPanel getCode={getText} language={codeLang} setLanguage={setCodeLang} docId={id} langOptions={langOptions} />
                <StatusBar language={codeLang} cursor={cursor} online={activeUsers.length} saveState={saveState} words={exts.wordcount ? wordCount : null} />
              </div>
            </div>
          )}

          {mode === 'richtext' && (
            <div style={{ display: 'flex', gap: 12, height: '100%' }}>
              <OutlinePanel editor={editor} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
                <WordRibbon editor={editor} title={title} onPrint={() => window.print()} onOpenTemplates={() => setShowTemplates(true)}
                  words={editor ? editor.storage.characterCount.words() : 0}
                  chars={editor ? editor.storage.characterCount.characters() : 0}
                  page={page} setPage={setPage} />
                <div style={{ flex: 1, overflow: 'auto', paddingBottom: 40 }}>
                  <div
                    className={`word-page word-theme-${page.theme} word-margin-${page.margin} ${page.orientation === 'landscape' ? 'word-landscape' : ''}`}
                    style={{ transform: `scale(${page.zoom / 100})`, transformOrigin: 'top center' }}>
                    <EditorContent editor={editor} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {mode === 'slides' && yjs && <SlidesEditor ydoc={yjs.ydoc} docId={id} readOnly={!canEdit} />}
          {mode === 'sheets' && yjs && <SheetEditor ydoc={yjs.ydoc} readOnly={!canEdit} />}
          {mode === 'whiteboard' && yjs && <Whiteboard ydoc={yjs.ydoc} readOnly={!canEdit} />}
        </main>
      </div>

      <RightSidebar docId={id} onRestore={() => window.location.reload()} />

      <GitPanel docId={id} getFiles={() => filesList.map(n => ({ name: n, content: yjs?.filesMap.get(n)?.toString() || '' }))} setFileContent={setFileContent} onPush={saveVersion} />
      <CallPanel docId={id} provider={yjs?.provider} />

      <CommandPalette commands={commands} />
      <AIPanel getContext={getEditorContext} onInsert={insertAIContent} tier={user?.tier} />

      {showTemplates && <TemplateModal editor={editor} onClose={() => setShowTemplates(false)} />}
      {showShare && <ShareModal docId={id} onClose={() => setShowShare(false)} />}
      {showMailMerge && <MailMerge editor={editor} onClose={() => setShowMailMerge(false)} />}
      {showExts && <ExtensionsModal exts={exts} onToggle={toggleExt} onClose={() => setShowExts(false)} />}
      {showDebug && <DebugModal debug={debug} onClose={() => setShowDebug(false)} />}

      {showReview && (
        <div className="modal-backdrop" onClick={() => setShowReview(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px' }}>🧠 Irus Code Review</h3>
            {review.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13.5 }}>
                <span style={{ color: r.sev === 'error' ? 'var(--danger)' : r.sev === 'warn' ? 'var(--warning)' : 'var(--success)' }}>●</span>
                <span>{r.n ? `Line ${r.n}: ` : ''}{r.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <input id="theme-import" type="file" accept=".json" hidden onChange={importTheme} />
    </div>
  );
}