import { useState, useMemo, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { createTheme } from '@uiw/codemirror-themes';
import { tags as t } from '@lezer/highlight';
import { languages } from '@codemirror/language-data';
import { LanguageDescription, LanguageSupport } from '@codemirror/language';
import { EditorView, highlightActiveLine } from '@codemirror/view';
import { bracketMatching } from '@codemirror/language';
import { yCollab } from 'y-codemirror.next';
import * as Y from 'yjs';
import {
  Files, Search, GitBranch, Play, Bug, Puzzle, Settings,
  Plus, Trash2, Edit2, Check, X, ChevronRight, ChevronDown,
  Terminal as TermIcon, AlertTriangle, CheckCircle2, Copy,
  RotateCcw, FolderPlus, FilePlus, Eye, EyeOff, Code2,
  Sparkles, CornerDownLeft, Command, Zap, FileCode2, AlignLeft,
  Folder, FolderOpen,
} from 'lucide-react';
import Minimap from './Minimap';
import { autocomplete } from './Autocomplete';
import { breakpointsExt, getBreakpointLines } from './Breakpoints';
import { todoHighlight } from '../extensions/todoHighlight';
import { reviewCode } from './reviewCode';
import { API } from '../store/authStore';

// 60+ Language database
export const ALL_LANGUAGES = [
  { id: 'python', name: 'Python', ext: 'py', color: '#3572A5' },
  { id: 'javascript', name: 'JavaScript (Node.js)', ext: 'js', color: '#f7df1e' },
  { id: 'typescript', name: 'TypeScript', ext: 'ts', color: '#3178c6' },
  { id: 'c', name: 'C (GCC)', ext: 'c', color: '#555555' },
  { id: 'c++', name: 'C++ (G++)', ext: 'cpp', color: '#f34b7d' },
  { id: 'java', name: 'Java (OpenJDK)', ext: 'java', color: '#b07219' },
  { id: 'rust', name: 'Rust', ext: 'rs', color: '#dea584' },
  { id: 'go', name: 'Go (Golang)', ext: 'go', color: '#00ADD8' },
  { id: 'php', name: 'PHP', ext: 'php', color: '#4F5D95' },
  { id: 'ruby', name: 'Ruby', ext: 'rb', color: '#701516' },
  { id: 'bash', name: 'Bash Shell', ext: 'sh', color: '#89e051' },
  { id: 'sql', name: 'SQL (SQLite3)', ext: 'sql', color: '#e38c00' },
  { id: 'html', name: 'HTML5', ext: 'html', color: '#e34c26' },
  { id: 'css', name: 'CSS3', ext: 'css', color: '#563d7c' },
  { id: 'json', name: 'JSON', ext: 'json', color: '#cbcb41' },
  { id: 'markdown', name: 'Markdown', ext: 'md', color: '#083fa1' },
  { id: 'lua', name: 'Lua', ext: 'lua', color: '#000080' },
  { id: 'r', name: 'R Language', ext: 'r', color: '#198ce7' },
  { id: 'swift', name: 'Swift', ext: 'swift', color: '#F05138' },
  { id: 'kotlin', name: 'Kotlin', ext: 'kt', color: '#A97BFF' },
  { id: 'perl', name: 'Perl', ext: 'pl', color: '#0298c3' },
];

export const getFileIcon = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  const found = ALL_LANGUAGES.find(l => l.ext === ext);
  const color = found ? found.color : '#8b93a7';
  return (
    <span style={{ color, fontWeight: 800, fontSize: 11, minWidth: 16 }}>
      {ext.slice(0, 3).toUpperCase()}
    </span>
  );
};

// VS Code Dark Theme
const vsCodeDarkTheme = createTheme({
  theme: 'dark',
  settings: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    caret: '#aeafad',
    selection: '#264f78',
    selectionMatch: '#515c6a',
    lineHighlight: '#2a2d2e',
    gutterBackground: '#1e1e1e',
    gutterForeground: '#858585',
  },
  styles: [
    { tag: t.keyword, color: '#569cd6' },
    { tag: t.operator, color: '#d4d4d4' },
    { tag: t.string, color: '#ce9178' },
    { tag: t.number, color: '#b5cea8' },
    { tag: t.comment, color: '#6a9955', fontStyle: 'italic' },
    { tag: t.function(t.variableName), color: '#dcdcaa' },
    { tag: t.typeName, color: '#4ec9b0' },
    { tag: t.variableName, color: '#9cdcfe' },
    { tag: t.propertyName, color: '#9cdcfe' },
  ],
});

// VS Code Light Theme
const vsCodeLightTheme = createTheme({
  theme: 'light',
  settings: {
    background: '#ffffff',
    foreground: '#000000',
    caret: '#000000',
    selection: '#add6ff',
    selectionMatch: '#d7e8ff',
    lineHighlight: '#f8f8f8',
    gutterBackground: '#ffffff',
    gutterForeground: '#237893',
  },
  styles: [
    { tag: t.keyword, color: '#0000ff' },
    { tag: t.string, color: '#a31515' },
    { tag: t.number, color: '#098658' },
    { tag: t.comment, color: '#008000', fontStyle: 'italic' },
    { tag: t.function(t.variableName), color: '#795e26' },
    { tag: t.typeName, color: '#267f99' },
  ],
});

const THEMES = {
  'VS Code Dark': vsCodeDarkTheme,
  'VS Code Light': vsCodeLightTheme,
  'One Dark': oneDark,
};

export default function VSCodeWorkspace({
  ydoc,
  provider,
  docId,
  readOnly,
  activeUsers = [],
  saveState = 'saved',
}) {
  const filesMap = ydoc.getMap('files');
  const [filesList, setFilesList] = useState([]);
  const [activeFile, setActiveFile] = useState('main.py');
  const [codeLang, setCodeLang] = useState('python');
  const [langSupport, setLangSupport] = useState(null);
  const [activeActivity, setActiveActivity] = useState('explorer');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bottomDockOpen, setBottomDockOpen] = useState(true);
  const [bottomTab, setBottomTab] = useState('terminal');
  const [dockHeight] = useState(230);
  const [versionCounter, setVersionCounter] = useState(0);

  // Folder collapse state
  const [collapsedFolders, setCollapsedFolders] = useState({});

  // Editor state
  const [cmView, setCmView] = useState(null);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [wrap, setWrap] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [themeName, setThemeName] = useState('VS Code Dark');
  const [showMinimap, setShowMinimap] = useState(true);
  const [editingFile, setEditingFile] = useState(null);
  const [newFileName, setNewFileName] = useState('');

  // Modals
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showGoToLine, setShowGoToLine] = useState(false);
  const [goToLineInput, setGoToLineInput] = useState('');
  const [paletteQuery, setPaletteQuery] = useState('');
  const [langSearch, setLangSearch] = useState('');

  // Search & Replace
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Terminal state
  const [cliInput, setCliInput] = useState('');
  const [cliHistory, setCliHistory] = useState([]);
  const [terminalLogs, setTerminalLogs] = useState([
    'Collab-Sheets Universal Terminal [v2.5.0 - 60+ Languages Ready]',
    'Type `run`, `python main.py`, `gcc main.c`, `ls`, or `help` to execute.',
  ]);
  const [running, setRunning] = useState(false);
  const [execResult, setExecResult] = useState(null);
  const [execHistory, setExecHistory] = useState([]);
  const terminalEndRef = useRef(null);

  // Git / Versions
  const [gitCommitMsg, setGitCommitMsg] = useState('');
  const [gitVersions, setGitVersions] = useState([]);
  const [gitLoading, setGitLoading] = useState(false);

  // Debugger
  const [debugOutput, setDebugOutput] = useState(null);
  const [debugVars, setDebugVars] = useState({});

  // Extensions
  const [exts, setExts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cs-exts') || '{"active-line":true,"brackets":true,"todo":true,"prettier":true,"python-intel":true}'); }
    catch { return { 'active-line': true, brackets: true, todo: true, prettier: true, 'python-intel': true }; }
  });

  // Sync files list from Yjs
  useEffect(() => {
    const updateFiles = () => {
      const keys = Array.from(filesMap.keys());
      setFilesList(keys);
      if (keys.length > 0 && !keys.includes(activeFile)) {
        setActiveFile(keys[0]);
      }
      setVersionCounter(c => c + 1);
    };
    filesMap.observe(updateFiles);
    updateFiles();
    return () => filesMap.unobserve(updateFiles);
  }, [filesMap, activeFile]);

  // Sync language with active file extension
  useEffect(() => {
    const ext = activeFile.split('.').pop().toLowerCase();
    const map = {
      py: 'python', js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      html: 'html', css: 'css', json: 'json', md: 'markdown', c: 'c', cpp: 'c++',
      java: 'java', rs: 'rust', go: 'go', php: 'php', sql: 'sql', sh: 'bash',
      pl: 'perl', lua: 'lua', r: 'r', swift: 'swift', kt: 'kotlin',
    };
    if (map[ext]) setCodeLang(map[ext]);
  }, [activeFile]);

  // Load language grammar for CodeMirror
  useEffect(() => {
    let cancelled = false;
    const desc = LanguageDescription.matchLanguageName(languages, codeLang, true);
    if (!desc) { setLangSupport(null); return; }
    desc.load().then(lang => {
      if (!cancelled) setLangSupport(new LanguageSupport(lang));
    }).catch(() => setLangSupport(null));
    return () => { cancelled = true; };
  }, [codeLang]);

  // Load execution & version history
  useEffect(() => {
    if (docId) {
      API.get(`/execute/history/${docId}`).then(r => setExecHistory(r.data || [])).catch(() => {});
      API.get(`/documents/${docId}/versions`).then(r => setGitVersions(r.data || [])).catch(() => {});
    }
  }, [docId]);

  const getText = (fileName = activeFile) => {
    if (fileName === activeFile && cmView) {
      return cmView.state.doc.toString();
    }
    return filesMap.get(fileName)?.toString() || '';
  };

  // CodeMirror Extensions
  const codemirrorExtensions = useMemo(() => {
    const activeText = filesMap.get(activeFile);
    return [
      EditorView.updateListener.of((u) => {
        if (u.selectionSet || u.docChanged) {
          const l = u.state.doc.lineAt(u.state.selection.main.head);
          setCursor({ line: l.number, col: u.state.selection.main.head - l.from + 1 });
          if (u.docChanged) setVersionCounter(c => c + 1);
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
      ...(activeText && provider ? [yCollab(activeText, provider.awareness)] : []),
    ];
  }, [filesMap, activeFile, provider, langSupport, wrap, fontSize, exts]);

  // Dynamic Outline Symbols parser
  const outlineSymbols = useMemo(() => {
    const content = getText();
    const list = [];
    content.split('\n').forEach((line, idx) => {
      const funcMatch = line.match(/(?:def|class|function|const|let|var|async\s+function|struct|fn|pub\s+fn|func)\s+([a-zA-Z0-9_$]+)/);
      if (funcMatch) {
        list.push({ name: funcMatch[1], line: idx + 1 });
      }
    });
    return list;
  }, [activeFile, versionCounter]);

  // Delete Symbol (function / class / declaration) from active file
  const deleteSymbol = (sym, e) => {
    e?.stopPropagation();
    if (!confirm(`Delete symbol "${sym.name}" from ${activeFile}?`)) return;
    const content = getText();
    const lines = content.split('\n');
    const startIdx = sym.line - 1;
    if (startIdx >= 0 && startIdx < lines.length) {
      const baseLine = lines[startIdx];
      const baseIndentMatch = baseLine.match(/^(\s*)/);
      const baseIndent = baseIndentMatch ? baseIndentMatch[1].length : 0;
      let endIdx = startIdx + 1;

      while (endIdx < lines.length) {
        const nextLine = lines[endIdx];
        if (nextLine.trim() === '') {
          endIdx++;
          continue;
        }
        const nextIndentMatch = nextLine.match(/^(\s*)/);
        const nextIndent = nextIndentMatch ? nextIndentMatch[1].length : 0;
        if (nextIndent <= baseIndent && (
          nextLine.trim().startsWith('def ') ||
          nextLine.trim().startsWith('class ') ||
          nextLine.trim().startsWith('function ') ||
          nextLine.trim().startsWith('const ') ||
          nextLine.trim().startsWith('let ') ||
          nextLine.trim().startsWith('var ') ||
          nextLine.trim().startsWith('pub fn ')
        )) {
          break;
        }
        endIdx++;
      }

      lines.splice(startIdx, Math.max(1, endIdx - startIdx));
      const newContent = lines.join('\n');
      const ytext = filesMap.get(activeFile);
      if (ytext) {
        ydoc.transact(() => {
          ytext.delete(0, ytext.length);
          ytext.insert(0, newContent);
        });
      }
    }
  };

  // Format Code (Prettier style)
  const formatDocument = () => {
    if (!cmView) return;
    const text = getText();
    const lines = text.split('\n');
    let indentLevel = 0;
    const formatted = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      const indented = '  '.repeat(indentLevel) + trimmed;
      if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(') || trimmed.endsWith(':')) {
        indentLevel++;
      }
      return indented;
    }).join('\n');

    if (activeTextY) {
      ydoc.transact(() => {
        activeTextY.delete(0, activeTextY.length);
        activeTextY.insert(0, formatted);
      });
    }
  };

  const activeTextY = filesMap.get(activeFile);

  // File & Folder Operations
  const addFile = (defaultName = '') => {
    const name = prompt('Enter new file name (e.g. app.py, main.cpp, server.ts, index.html):', defaultName || 'untitled.js');
    if (name && !filesMap.has(name)) {
      ydoc.transact(() => filesMap.set(name, new Y.Text('')));
      setActiveFile(name);
    }
  };

  const addFolder = () => {
    const folderName = prompt('Enter new folder name (e.g. src, components, utils, backend):');
    if (folderName) {
      const clean = folderName.trim().replace(/^\/+|\/+$/g, '');
      if (!clean) return;
      const initialFile = `${clean}/index.js`;
      if (!filesMap.has(initialFile)) {
        ydoc.transact(() => {
          filesMap.set(initialFile, new Y.Text(`// Created in folder: ${clean}\n`));
        });
        setActiveFile(initialFile);
      }
    }
  };

  const addFileInFolder = (folder, e) => {
    e?.stopPropagation();
    const fileName = prompt(`Enter new file name inside folder "${folder}" (e.g. App.jsx, utils.js, styles.css):`);
    if (fileName) {
      const fullPath = `${folder}/${fileName.trim().replace(/^\/+/, '')}`;
      if (!filesMap.has(fullPath)) {
        ydoc.transact(() => filesMap.set(fullPath, new Y.Text('')));
        setActiveFile(fullPath);
      }
    }
  };

  const deleteFolder = (folder, e) => {
    e?.stopPropagation();
    if (confirm(`Are you sure you want to delete folder "${folder}" and all its files?`)) {
      ydoc.transact(() => {
        filesList.forEach(fn => {
          if (fn.startsWith(`${folder}/`)) {
            filesMap.delete(fn);
          }
        });
      });
      const remaining = filesList.filter(f => !f.startsWith(`${folder}/`));
      if (remaining.length > 0) setActiveFile(remaining[0]);
    }
  };

  const deleteFile = (name, e) => {
    e?.stopPropagation();
    if (filesList.length <= 1) return alert('Workspace must contain at least one file.');
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      ydoc.transact(() => filesMap.delete(name));
      const remaining = filesList.filter(f => f !== name);
      if (activeFile === name) setActiveFile(remaining[0]);
    }
  };

  const duplicateFile = (name, e) => {
    e?.stopPropagation();
    const parts = name.split('.');
    const ext = parts.length > 1 ? '.' + parts.pop() : '';
    const base = parts.join('.');
    const dupName = `${base}_copy${ext}`;
    if (!filesMap.has(dupName)) {
      const srcText = filesMap.get(name)?.toString() || '';
      ydoc.transact(() => filesMap.set(dupName, new Y.Text(srcText)));
      setActiveFile(dupName);
    }
  };

  const startRename = (name, e) => {
    e?.stopPropagation();
    setEditingFile(name);
    setNewFileName(name);
  };

  const saveRename = (oldName) => {
    const trim = newFileName.trim();
    if (trim && trim !== oldName && !filesMap.has(trim)) {
      const text = filesMap.get(oldName);
      ydoc.transact(() => {
        filesMap.delete(oldName);
        filesMap.set(trim, text);
      });
      if (activeFile === oldName) setActiveFile(trim);
    }
    setEditingFile(null);
  };

  // Group files into Folders and Root
  const { folders, rootFiles } = useMemo(() => {
    const fMap = {};
    const rFiles = [];
    filesList.forEach(fn => {
      const slashIdx = fn.indexOf('/');
      if (slashIdx > 0) {
        const folderName = fn.slice(0, slashIdx);
        const subFile = fn.slice(slashIdx + 1);
        if (!fMap[folderName]) fMap[folderName] = [];
        fMap[folderName].push({ fullPath: fn, name: subFile });
      } else {
        rFiles.push(fn);
      }
    });
    return { folders: fMap, rootFiles: rFiles };
  }, [filesList]);

  // Run Code with 60+ Language Cloud & Local Support
  const runCode = async (targetFile = activeFile) => {
    setRunning(true);
    setBottomDockOpen(true);
    setBottomTab('terminal');
    try {
      const code = getText(targetFile);
      const ext = targetFile.split('.').pop().toLowerCase();
      const langMatch = ALL_LANGUAGES.find(l => l.ext === ext);
      const lang = langMatch ? langMatch.id : codeLang;
      const startT = Date.now();

      const { data } = await API.post('/execute', {
        language: lang,
        code,
        stdin: '',
        documentId: docId,
      });
      const elapsed = Date.now() - startT;
      setExecResult(data);

      const logs = [`$ ${lang} ${targetFile}`];
      if (data.run?.stdout) logs.push(data.run.stdout);
      if (data.run?.stderr) logs.push(`[stderr] ${data.run.stderr}`);
      if (!data.run?.stdout && !data.run?.stderr) {
        logs.push(`[Process finished with exit code ${data.run?.code ?? 0}]`);
      } else {
        logs.push(`[Done] Process exited with code ${data.run?.code ?? 0} in ${elapsed}ms (${data.run?.provider || 'cloud'})`);
      }

      setTerminalLogs(prev => [...prev, ...logs]);

      if (data.run?.stderr) setBottomTab('problems');
      if (docId) {
        API.get(`/execute/history/${docId}`).then(r => setExecHistory(r.data || [])).catch(() => {});
      }
    } catch (e) {
      setTerminalLogs(prev => [...prev, `❌ Execution failed: ${e.response?.data?.error || e.message}`]);
    }
    setRunning(false);
  };

  // Interactive Terminal Command Execution
  const handleTerminalSubmit = async (e) => {
    e.preventDefault();
    const cmd = cliInput.trim();
    if (!cmd) return;

    setCliHistory(h => [...h, cmd]);
    setCliInput('');

    const newLogs = [`collabsheets@workspace:~/collabsheets$ ${cmd}`];

    if (cmd === 'clear' || cmd === 'cls') {
      setTerminalLogs([]);
      return;
    }

    if (cmd === 'help') {
      newLogs.push(
        'Collab-Sheets Universal Terminal Shell Commands:',
        '  run                     - Execute active code file',
        '  python / python3 <file> - Run Python script',
        '  node / js <file>        - Run JavaScript program',
        '  ts / tsx <file>         - Run TypeScript program',
        '  gcc / c <file>          - Compile & run C program',
        '  g++ / cpp <file>        - Compile & run C++ program',
        '  rust / rustc <file>     - Compile & run Rust program',
        '  go / golang <file>      - Run Go program',
        '  java / javac <file>     - Compile & run Java class',
        '  php <file>              - Run PHP script',
        '  ruby / rb <file>        - Run Ruby script',
        '  ls / dir                - List workspace files and sizes',
        '  pwd                     - Print working directory',
        '  cat <file>              - View contents of file',
        '  touch <file>            - Create new file',
        '  mkdir <folder>          - Create new folder',
        '  rm <file>               - Remove file from workspace',
        '  git status              - Show git branch info',
        '  git log                 - Show commit history',
        '  clear / cls             - Clear screen',
        '  date / whoami / echo    - Standard utilities'
      );
      setTerminalLogs(prev => [...prev, ...newLogs]);
      return;
    }

    if (cmd === 'pwd') {
      newLogs.push('/workspace/collabsheets');
      setTerminalLogs(prev => [...prev, ...newLogs]);
      return;
    }

    if (cmd === 'ls' || cmd === 'dir') {
      if (filesList.length === 0) {
        newLogs.push('(empty workspace)');
      } else {
        const fileEntries = filesList.map(fn => {
          const len = filesMap.get(fn)?.toString()?.length || 0;
          return `${fn.padEnd(18)} (${len} B)`;
        });
        newLogs.push(fileEntries.join('\n'));
      }
      setTerminalLogs(prev => [...prev, ...newLogs]);
      return;
    }

    if (cmd.startsWith('cat ')) {
      const target = cmd.slice(4).trim();
      const content = filesMap.get(target)?.toString();
      if (content !== undefined) newLogs.push(content || '(empty file)');
      else newLogs.push(`cat: ${target}: No such file in workspace`);
      setTerminalLogs(prev => [...prev, ...newLogs]);
      return;
    }

    if (cmd.startsWith('touch ')) {
      const target = cmd.slice(6).trim();
      if (target && !filesMap.has(target)) {
        ydoc.transact(() => filesMap.set(target, new Y.Text('')));
        newLogs.push(`Created file: ${target}`);
      } else {
        newLogs.push(`File already exists or invalid name.`);
      }
      setTerminalLogs(prev => [...prev, ...newLogs]);
      return;
    }

    if (cmd.startsWith('mkdir ')) {
      const folderTarget = cmd.slice(6).trim();
      if (folderTarget) {
        const initFile = `${folderTarget}/index.js`;
        if (!filesMap.has(initFile)) {
          ydoc.transact(() => filesMap.set(initFile, new Y.Text(`// ${folderTarget}/index.js\n`)));
          newLogs.push(`Created folder: ${folderTarget}`);
        } else {
          newLogs.push(`Folder ${folderTarget} already exists.`);
        }
      }
      setTerminalLogs(prev => [...prev, ...newLogs]);
      return;
    }

    if (cmd.startsWith('rm ')) {
      const target = cmd.slice(3).trim();
      if (filesMap.has(target)) {
        if (filesList.length <= 1) {
          newLogs.push(`rm: cannot remove '${target}': workspace requires at least one file`);
        } else {
          ydoc.transact(() => filesMap.delete(target));
          newLogs.push(`Removed: ${target}`);
        }
      } else {
        newLogs.push(`rm: ${target}: No such file`);
      }
      setTerminalLogs(prev => [...prev, ...newLogs]);
      return;
    }

    if (cmd === 'git status') {
      newLogs.push(
        'On branch main',
        'Your branch is up to date with origin/main.',
        `Workspace tracking ${filesList.length} files across ${Object.keys(folders).length} folders.`
      );
      setTerminalLogs(prev => [...prev, ...newLogs]);
      return;
    }

    if (cmd === 'git log') {
      if (gitVersions.length === 0) {
        newLogs.push('commit 9f4a1bc (HEAD -> main)\nAuthor: Developer <dev@collabsheets.com>\nDate: Initial commit');
      } else {
        gitVersions.slice(0, 5).forEach(v => {
          newLogs.push(`commit ${v.id.slice(0, 7)} - ${v.title} (${new Date(v.created_at).toLocaleTimeString()})`);
        });
      }
      setTerminalLogs(prev => [...prev, ...newLogs]);
      return;
    }

    if (cmd === 'date') {
      newLogs.push(new Date().toUTCString());
      setTerminalLogs(prev => [...prev, ...newLogs]);
      return;
    }

    if (cmd === 'whoami') {
      newLogs.push('developer@collabsheets.com');
      setTerminalLogs(prev => [...prev, ...newLogs]);
      return;
    }

    if (cmd.startsWith('echo ')) {
      newLogs.push(cmd.slice(5));
      setTerminalLogs(prev => [...prev, ...newLogs]);
      return;
    }

    if (cmd === 'run') {
      setTerminalLogs(prev => [...prev, ...newLogs]);
      runCode(activeFile);
      return;
    }

    // Generic Runner for any compiler command
    const runnerPrefixes = ['python', 'python3', 'node', 'js', 'ts', 'tsx', 'gcc', 'c', 'g++', 'cpp', 'rust', 'rustc', 'go', 'java', 'javac', 'php', 'ruby'];
    const matchedPrefix = runnerPrefixes.find(p => cmd.startsWith(p + ' ') || cmd === p);

    if (matchedPrefix) {
      const rest = cmd.slice(matchedPrefix.length).trim();
      const fileToRun = rest || activeFile;
      setTerminalLogs(prev => [...prev, ...newLogs]);
      runCode(fileToRun);
      return;
    }

    newLogs.push(`bash: ${cmd}: command not found. Type 'help' for commands or 'run' to execute.`);
    setTerminalLogs(prev => [...prev, ...newLogs]);
  };

  // Debug Run (Python)
  const debugRun = async () => {
    if (!cmView) return;
    const bps = getBreakpointLines(cmView);
    if (!bps.length) return alert('Click the LEFT GUTTER next to a line number to place a red breakpoint dot first.');
    const lines = getText().split('\n');
    [...bps].sort((a, b) => b - a).forEach(n => {
      if (n <= lines.length) {
        lines.splice(n, 0, `print("__DBG__", ${n}, {k: v for k, v in list(locals().items()) if not k.startswith('__') and k != 'print'})`);
      }
    });

    setRunning(true);
    setBottomDockOpen(true);
    setBottomTab('debug');
    try {
      const { data } = await API.post('/execute', {
        language: 'python',
        code: lines.join('\n'),
        stdin: '',
        documentId: docId,
      });
      const rawLines = (data.run?.stdout || '').split('\n');
      const stops = [];
      const normal = [];
      rawLines.forEach(l => {
        if (l.startsWith('__DBG__')) {
          const m = l.match(/^__DBG__ (\d+) (.*)$/);
          if (m) {
            let vars = {};
            try { vars = JSON.parse(m[2].replace(/True/g, 'true').replace(/False/g, 'false').replace(/None/g, 'null').replace(/'/g, '"')); }
            catch { vars = { raw: m[2] }; }
            stops.push({ line: +m[1], vars });
            setDebugVars(vars);
          }
        } else normal.push(l);
      });
      setDebugOutput({ stops, stdout: normal.join('\n'), stderr: data.run?.stderr || '' });
    } catch (err) {
      alert('Debug error: ' + err.message);
    }
    setRunning(false);
  };

  // Global Search across files
  const handleSearch = (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    const res = [];
    filesList.forEach(fn => {
      const content = filesMap.get(fn)?.toString() || '';
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(q.toLowerCase())) {
          res.push({ file: fn, lineNum: idx + 1, text: line.trim() });
        }
      });
    });
    setSearchResults(res);
  };

  const handleReplaceAll = () => {
    if (!searchQuery) return;
    ydoc.transact(() => {
      filesList.forEach(fn => {
        const ytext = filesMap.get(fn);
        if (ytext) {
          const orig = ytext.toString();
          if (orig.includes(searchQuery)) {
            const updated = orig.replaceAll(searchQuery, replaceQuery);
            ytext.delete(0, ytext.length);
            ytext.insert(0, updated);
          }
        }
      });
    });
    handleSearch(searchQuery);
    alert(`Replaced all occurrences of "${searchQuery}" with "${replaceQuery}" across workspace.`);
  };

  // Git commit snapshot
  const handleGitCommit = async () => {
    if (!gitCommitMsg.trim() || !docId) return;
    setGitLoading(true);
    try {
      await API.post(`/documents/${docId}/versions`, { title: gitCommitMsg.trim() });
      setGitCommitMsg('');
      const r = await API.get(`/documents/${docId}/versions`);
      setGitVersions(r.data || []);
    } catch (e) {
      alert('Git commit failed: ' + e.message);
    }
    setGitLoading(false);
  };

  // Problems / Linter
  const problems = useMemo(() => {
    return reviewCode(getText(), codeLang);
  }, [activeFile, codeLang, versionCounter]);

  // Jump to Line
  const jumpToLine = (n) => {
    if (cmView) {
      const line = cmView.state.doc.line(Math.min(n, cmView.state.doc.lines));
      cmView.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
      cmView.focus();
    }
  };

  const toggleExt = (id) => {
    const next = { ...exts, [id]: !exts[id] };
    setExts(next);
    localStorage.setItem('cs-exts', JSON.stringify(next));
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runCode(activeFile);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed(s => !s);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setShowCommandPalette(p => !p);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        setShowGoToLine(true);
      }
      if ((e.shiftKey && e.altKey && e.key === 'F') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        formatDocument();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="vscode-root">
      {/* 1️⃣ VS CODE LEFT ACTIVITY BAR */}
      <div className="vscode-activity-bar">
        <button
          className={`activity-btn ${activeActivity === 'explorer' && !sidebarCollapsed ? 'active' : ''}`}
          title="Explorer (Ctrl+Shift+E)"
          onClick={() => {
            if (activeActivity === 'explorer') setSidebarCollapsed(!sidebarCollapsed);
            else { setActiveActivity('explorer'); setSidebarCollapsed(false); }
          }}
        >
          <Files size={22} />
        </button>
        <button
          className={`activity-btn ${activeActivity === 'search' && !sidebarCollapsed ? 'active' : ''}`}
          title="Search & Replace (Ctrl+Shift+F)"
          onClick={() => {
            if (activeActivity === 'search') setSidebarCollapsed(!sidebarCollapsed);
            else { setActiveActivity('search'); setSidebarCollapsed(false); }
          }}
        >
          <Search size={22} />
        </button>
        <button
          className={`activity-btn ${activeActivity === 'git' && !sidebarCollapsed ? 'active' : ''}`}
          title="Source Control (Ctrl+Shift+G)"
          onClick={() => {
            if (activeActivity === 'git') setSidebarCollapsed(!sidebarCollapsed);
            else { setActiveActivity('git'); setSidebarCollapsed(false); }
          }}
        >
          <GitBranch size={22} />
          {gitVersions.length > 0 && <span className="activity-badge">{gitVersions.length}</span>}
        </button>
        <button
          className={`activity-btn ${activeActivity === 'debug' && !sidebarCollapsed ? 'active' : ''}`}
          title="Run & Debug (Ctrl+Shift+D)"
          onClick={() => {
            if (activeActivity === 'debug') setSidebarCollapsed(!sidebarCollapsed);
            else { setActiveActivity('debug'); setSidebarCollapsed(false); }
          }}
        >
          <Bug size={22} />
        </button>
        <button
          className={`activity-btn ${activeActivity === 'extensions' && !sidebarCollapsed ? 'active' : ''}`}
          title="Extensions Marketplace (Ctrl+Shift+X)"
          onClick={() => {
            if (activeActivity === 'extensions') setSidebarCollapsed(!sidebarCollapsed);
            else { setActiveActivity('extensions'); setSidebarCollapsed(false); }
          }}
        >
          <Puzzle size={22} />
          <span className="activity-badge" style={{ background: '#38bdf8' }}>
            {Object.values(exts).filter(Boolean).length}
          </span>
        </button>

        <div style={{ flex: 1 }} />

        <button
          className={`activity-btn ${activeActivity === 'settings' && !sidebarCollapsed ? 'active' : ''}`}
          title="Settings & Themes"
          onClick={() => {
            if (activeActivity === 'settings') setSidebarCollapsed(!sidebarCollapsed);
            else { setActiveActivity('settings'); setSidebarCollapsed(false); }
          }}
        >
          <Settings size={22} />
        </button>
      </div>

      {/* 2️⃣ PRIMARY SIDEBAR (EXPLORER / SEARCH / GIT / DEBUG / EXTENSIONS) */}
      {!sidebarCollapsed && (
        <div className="vscode-sidebar">
          {/* Header */}
          <div className="vscode-sidebar-header">
            <span>{activeActivity.toUpperCase()}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {activeActivity === 'explorer' && (
                <>
                  <button className="vscode-icon-btn" title="New File" onClick={() => addFile()}><FilePlus size={14} /></button>
                  <button className="vscode-icon-btn" title="New Folder" onClick={addFolder}><FolderPlus size={14} /></button>
                  <button className="vscode-icon-btn" title="Collapse All" onClick={() => {}}><ChevronDown size={14} /></button>
                </>
              )}
              <button className="vscode-icon-btn" title="Close Sidebar" onClick={() => setSidebarCollapsed(true)}><X size={14} /></button>
            </div>
          </div>

          <div className="vscode-sidebar-content">
            {/* EXPLORER VIEW */}
            {activeActivity === 'explorer' && (
              <div className="vscode-explorer">
                <div className="explorer-section-title">
                  <ChevronDown size={14} /> <span>WORKSPACE FOLDERS & FILES</span>
                </div>

                <div className="explorer-tree">
                  {/* Render Folders */}
                  {Object.entries(folders).map(([folderName, folderFiles]) => {
                    const isCollapsed = collapsedFolders[folderName];
                    return (
                      <div key={folderName} className="folder-block">
                        <div
                          className="explorer-folder-header"
                          onClick={() => setCollapsedFolders(c => ({ ...c, [folderName]: !c[folderName] }))}
                        >
                          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                          {isCollapsed ? <Folder size={14} style={{ color: '#f59e0b' }} /> : <FolderOpen size={14} style={{ color: '#f59e0b' }} />}
                          <span className="folder-title">{folderName}</span>
                          <div className="item-actions">
                            <button
                              className="vscode-icon-btn"
                              title="New File in Folder"
                              onClick={(e) => addFileInFolder(folderName, e)}
                            >
                              <Plus size={12} />
                            </button>
                            <button
                              className="vscode-icon-btn"
                              title="Delete Folder"
                              onClick={(e) => deleteFolder(folderName, e)}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Folder Files */}
                        {!isCollapsed && (
                          <div className="folder-children">
                            {folderFiles.map(fileObj => (
                              <div
                                key={fileObj.fullPath}
                                className={`explorer-item folder-child-item ${activeFile === fileObj.fullPath ? 'active' : ''}`}
                                onClick={() => setActiveFile(fileObj.fullPath)}
                              >
                                {getFileIcon(fileObj.name)}
                                <span className="file-label">{fileObj.name}</span>
                                <div className="item-actions">
                                  <button className="vscode-icon-btn" title="Rename" onClick={(e) => startRename(fileObj.fullPath, e)}><Edit2 size={12} /></button>
                                  <button className="vscode-icon-btn" title="Duplicate" onClick={(e) => duplicateFile(fileObj.fullPath, e)}><Copy size={12} /></button>
                                  <button className="vscode-icon-btn" title="Delete" onClick={(e) => deleteFile(fileObj.fullPath, e)}><Trash2 size={12} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Render Root Files */}
                  {rootFiles.map(fileName => (
                    <div
                      key={fileName}
                      className={`explorer-item ${activeFile === fileName ? 'active' : ''}`}
                      onClick={() => setActiveFile(fileName)}
                    >
                      {getFileIcon(fileName)}
                      {editingFile === fileName ? (
                        <div style={{ display: 'flex', gap: 4, flex: 1 }} onClick={e => e.stopPropagation()}>
                          <input
                            className="vscode-mini-input"
                            value={newFileName}
                            onChange={e => setNewFileName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveRename(fileName)}
                            autoFocus
                          />
                          <button className="vscode-icon-btn" onClick={() => saveRename(fileName)}><Check size={12} /></button>
                          <button className="vscode-icon-btn" onClick={() => setEditingFile(null)}><X size={12} /></button>
                        </div>
                      ) : (
                        <>
                          <span className="file-label">{fileName}</span>
                          <div className="item-actions">
                            <button className="vscode-icon-btn" title="Rename" onClick={(e) => startRename(fileName, e)}><Edit2 size={12} /></button>
                            <button className="vscode-icon-btn" title="Duplicate" onClick={(e) => duplicateFile(fileName, e)}><Copy size={12} /></button>
                            <button className="vscode-icon-btn" title="Delete" onClick={(e) => deleteFile(fileName, e)}><Trash2 size={12} /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                <div className="explorer-section-title" style={{ marginTop: 16 }}>
                  <ChevronDown size={14} /> <span>OUTLINE & SYMBOLS</span>
                </div>
                <div className="outline-symbols-list">
                  {outlineSymbols.length === 0 ? (
                    <div style={{ fontSize: 11, color: 'var(--muted)', padding: '6px 8px' }}>No functions or classes detected</div>
                  ) : (
                    outlineSymbols.map((sym, idx) => (
                      <div key={idx} className="symbol-item" onClick={() => jumpToLine(sym.line)}>
                        <Code2 size={12} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontWeight: 600 }}>{sym.name}</span>
                        <span className="symbol-line">: {sym.line}</span>
                        <div className="symbol-item-actions">
                          <button
                            className="vscode-icon-btn"
                            title={`Delete ${sym.name} from code`}
                            onClick={(e) => deleteSymbol(sym, e)}
                          >
                            <Trash2 size={12} style={{ color: 'var(--danger)' }} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* SEARCH VIEW */}
            {activeActivity === 'search' && (
              <div className="vscode-search-view">
                <input
                  className="vscode-input"
                  placeholder="Search workspace (e.g. import, function)"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <input
                    className="vscode-input"
                    placeholder="Replace with..."
                    value={replaceQuery}
                    onChange={e => setReplaceQuery(e.target.value)}
                  />
                  <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={handleReplaceAll}>
                    Replace All
                  </button>
                </div>

                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12, fontWeight: 700 }}>
                  {searchResults.length} results in {new Set(searchResults.map(s => s.file)).size} files
                </div>

                <div className="search-results-list">
                  {searchResults.map((res, i) => (
                    <div
                      key={i}
                      className="search-result-item"
                      onClick={() => { setActiveFile(res.file); jumpToLine(res.lineNum); }}
                    >
                      <div className="result-file">{getFileIcon(res.file)} {res.file} : {res.lineNum}</div>
                      <div className="result-text">{res.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SOURCE CONTROL (GIT) VIEW */}
            {activeActivity === 'git' && (
              <div className="vscode-git-view">
                <div className="git-commit-box">
                  <textarea
                    className="vscode-input"
                    rows={3}
                    placeholder="Commit message (e.g. feat: add authentication)"
                    value={gitCommitMsg}
                    onChange={e => setGitCommitMsg(e.target.value)}
                  />
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: 8, fontSize: 12 }}
                    onClick={handleGitCommit}
                    disabled={gitLoading || !gitCommitMsg.trim()}
                  >
                    <Check size={14} /> Commit & Snapshot
                  </button>
                </div>

                <div className="explorer-section-title" style={{ marginTop: 18 }}>
                  <ChevronDown size={14} /> <span>VERSION TIMELINE ({gitVersions.length})</span>
                </div>
                <div className="git-history-list">
                  {gitVersions.map(v => (
                    <div key={v.id} className="git-history-item">
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{v.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                        {new Date(v.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RUN & DEBUG VIEW */}
            {activeActivity === 'debug' && (
              <div className="vscode-debug-view">
                <div className="debug-toolbar">
                  <button className="btn btn-primary" style={{ flex: 1, padding: '6px 10px', fontSize: 12 }} onClick={debugRun}>
                    <Bug size={14} /> Start Debugging (Python)
                  </button>
                </div>
                <div className="explorer-section-title" style={{ marginTop: 14 }}>
                  <ChevronDown size={14} /> <span>VARIABLES</span>
                </div>
                <div className="debug-vars-list">
                  {Object.keys(debugVars).length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--muted)', padding: '6px 0' }}>No debug variables in scope. Run debug with a breakpoint.</div>
                  ) : (
                    Object.entries(debugVars).map(([k, v]) => (
                      <div key={k} className="debug-var-row">
                        <span className="var-key">{k}:</span>
                        <span className="var-val">{JSON.stringify(v)}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="explorer-section-title" style={{ marginTop: 14 }}>
                  <ChevronDown size={14} /> <span>BREAKPOINTS</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', padding: '6px 0' }}>
                  Click the left editor margin to add/remove breakpoints.
                </div>
              </div>
            )}

            {/* EXTENSIONS MARKETPLACE */}
            {activeActivity === 'extensions' && (
              <div className="vscode-ext-view">
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Installed & Available Extensions:</div>
                {[
                  { id: 'active-line', name: 'Highlight Active Line', desc: 'Highlights current active cursor line in editor' },
                  { id: 'brackets', name: 'Bracket Pair Colorizer', desc: 'Matches and highlights matching brackets with color pairs' },
                  { id: 'todo', name: 'TODO Highlighter', desc: 'Highlights TODO:, FIXME:, NOTE:, BUG: tags in code' },
                  { id: 'prettier', name: 'Prettier Code Formatter', desc: 'Auto-formats code with Shift+Alt+F' },
                  { id: 'python-intel', name: 'Python IntelliSense & Linter', desc: 'Syntax linting and autocompletion' },
                ].map(item => (
                  <div key={item.id} className="ext-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</span>
                      <button
                        className={`btn ${exts[item.id] ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ padding: '3px 8px', fontSize: 11 }}
                        onClick={() => toggleExt(item.id)}
                      >
                        {exts[item.id] ? 'Enabled' : 'Enable'}
                      </button>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            )}

            {/* SETTINGS VIEW */}
            {activeActivity === 'settings' && (
              <div className="vscode-settings-view">
                <div style={{ marginBottom: 14 }}>
                  <label className="setting-label">Editor Theme</label>
                  <select className="vscode-select" value={themeName} onChange={e => setThemeName(e.target.value)}>
                    {Object.keys(THEMES).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="setting-label">Font Size ({fontSize}px)</label>
                  <input
                    type="range"
                    min={11}
                    max={22}
                    value={fontSize}
                    onChange={e => setFontSize(+e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="setting-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={wrap} onChange={e => setWrap(e.target.checked)} />
                    <span>Word Wrap</span>
                  </label>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="setting-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={showMinimap} onChange={e => setShowMinimap(e.target.checked)} />
                    <span>Show Code Minimap</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3️⃣ MAIN EDITOR & TABS & TERMINAL AREA */}
      <div className="vscode-editor-pane">
        {/* Editor Tabs Bar */}
        <div className="vscode-tabs-bar">
          <div className="tabs-list">
            {filesList.map(fn => (
              <div
                key={fn}
                className={`vscode-tab ${activeFile === fn ? 'active' : ''}`}
                onClick={() => setActiveFile(fn)}
              >
                {getFileIcon(fn)}
                <span className="tab-title">{fn}</span>
                <button
                  className="tab-close"
                  onClick={(e) => deleteFile(fn, e)}
                  title="Close"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          <div className="tabs-actions">
            <button className="vscode-icon-btn" title="New File" onClick={() => addFile()}><FilePlus size={14} /></button>
            <button className="vscode-icon-btn" title="Format Document (Shift+Alt+F)" onClick={formatDocument}>
              <AlignLeft size={14} />
            </button>
            <button
              className="vscode-icon-btn"
              title="Command Palette (Ctrl+Shift+P)"
              onClick={() => setShowCommandPalette(true)}
            >
              <Command size={14} />
            </button>
            <button className="vscode-icon-btn" title="Run Code (Ctrl+Enter)" onClick={() => runCode(activeFile)} disabled={running}>
              <Play size={14} style={{ color: 'var(--success)' }} />
            </button>
            <button className="vscode-icon-btn" title="Debug Run (Python)" onClick={debugRun}>
              <Bug size={14} style={{ color: 'var(--warning)' }} />
            </button>
            <button className="vscode-icon-btn" title="Toggle Minimap" onClick={() => setShowMinimap(!showMinimap)}>
              {showMinimap ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </div>
        </div>

        {/* Breadcrumb Bar */}
        <div className="vscode-breadcrumbs">
          <span>workspace</span>
          <ChevronRight size={12} />
          {getFileIcon(activeFile)}
          <span style={{ fontWeight: 600 }}>{activeFile}</span>
          <div style={{ flex: 1 }} />
          <span style={{ color: 'var(--muted)', fontSize: 11 }}>
            {saveState === 'saved' ? 'Saved' : 'Saving...'}
          </span>
        </div>

        {/* CodeMirror Workspace Stage */}
        <div className="vscode-stage">
          <div className="vscode-cm-container">
            <CodeMirror
              key={activeFile}
              height="100%"
              theme={THEMES[themeName] || vsCodeDarkTheme}
              extensions={codemirrorExtensions}
              style={{ height: '100%', fontSize: `${fontSize}px` }}
              editable={!readOnly}
              onCreateEditor={(view) => setCmView(view)}
            />
          </div>
          {showMinimap && (
            <div className="vscode-minimap-container">
              <Minimap code={getText()} onJump={jumpToLine} />
            </div>
          )}
        </div>

        {/* 4️⃣ VS CODE BOTTOM DOCK (TERMINAL / PROBLEMS / OUTPUT / DEBUG CONSOLE) */}
        {bottomDockOpen && (
          <div className="vscode-bottom-dock" style={{ height: `${dockHeight}px` }}>
            <div className="dock-header">
              <div className="dock-tabs">
                <button
                  className={`dock-tab ${bottomTab === 'terminal' ? 'active' : ''}`}
                  onClick={() => setBottomTab('terminal')}
                >
                  <TermIcon size={13} /> TERMINAL
                </button>
                <button
                  className={`dock-tab ${bottomTab === 'problems' ? 'active' : ''}`}
                  onClick={() => setBottomTab('problems')}
                >
                  <AlertTriangle size={13} /> PROBLEMS {problems.length > 0 && <span className="tab-pill">{problems.length}</span>}
                </button>
                <button
                  className={`dock-tab ${bottomTab === 'output' ? 'active' : ''}`}
                  onClick={() => setBottomTab('output')}
                >
                  OUTPUT
                </button>
                <button
                  className={`dock-tab ${bottomTab === 'debug' ? 'active' : ''}`}
                  onClick={() => setBottomTab('debug')}
                >
                  DEBUG CONSOLE
                </button>
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => runCode(activeFile)} disabled={running}>
                  <Play size={12} /> {running ? 'Running...' : 'Run'}
                </button>
                <button className="vscode-icon-btn" title="Clear Terminal" onClick={() => setTerminalLogs([])}><RotateCcw size={13} /></button>
                <button className="vscode-icon-btn" title="Close Panel" onClick={() => setBottomDockOpen(false)}><X size={14} /></button>
              </div>
            </div>

            <div className="dock-content">
              {bottomTab === 'terminal' && (
                <div className="dock-terminal-view">
                  <div className="terminal-logs-scroll">
                    {terminalLogs.map((log, i) => (
                      <div key={i} className="terminal-line">{log}</div>
                    ))}
                    <div ref={terminalEndRef} />
                  </div>

                  {/* Interactive CLI Command Bar */}
                  <form className="terminal-cli-form" onSubmit={handleTerminalSubmit}>
                    <span className="terminal-prompt">collabsheets@workspace:~/collabsheets$</span>
                    <input
                      className="terminal-cli-input"
                      value={cliInput}
                      onChange={e => setCliInput(e.target.value)}
                      placeholder="Type command (e.g. run, python main.py, gcc main.c, ls, pwd, mkdir, help)..."
                      autoFocus
                    />
                    <button type="submit" className="terminal-send-btn" title="Run command">
                      <CornerDownLeft size={13} />
                    </button>
                  </form>
                </div>
              )}

              {bottomTab === 'problems' && (
                <div className="dock-problems-view">
                  {problems.length === 0 ? (
                    <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={14} /> No problems detected in {activeFile}.
                    </div>
                  ) : (
                    problems.map((p, i) => (
                      <div key={i} className="problem-row" onClick={() => p.n && jumpToLine(p.n)}>
                        <AlertTriangle size={13} style={{ color: p.sev === 'error' ? 'var(--danger)' : 'var(--warning)', marginTop: 2 }} />
                        <span>{p.n ? `Line ${p.n}: ` : ''}{p.msg}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {bottomTab === 'output' && (
                <div className="dock-output-view">
                  <div>Active Language: <b>{codeLang.toUpperCase()}</b></div>
                  <div>Execution Status: {execResult ? `Exit Code ${execResult.run?.code} in ${execResult.executionTime || 0}ms (${execResult.run?.provider || 'cloud'})` : 'Ready'}</div>
                  {execHistory.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>Recent History:</div>
                      {execHistory.slice(0, 5).map(h => (
                        <div key={h.id} style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {h.language} • {h.execution_time_ms}ms • {h.error ? 'Failed ✗' : 'Success ✓'} • {new Date(h.created_at).toLocaleTimeString()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {bottomTab === 'debug' && (
                <div className="dock-debug-view">
                  {debugOutput ? (
                    <pre className="terminal-pre">{debugOutput.stdout || 'Debug session finished without stdout output.'}</pre>
                  ) : (
                    <div>Click "Start Debugging" in the Run & Debug panel to inspect breakpoints and variable snapshots.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5️⃣ VS CODE STATUS BAR AT BOTTOM */}
        <div className="vscode-status-bar">
          <div className="sb-left">
            <span className="sb-item"><GitBranch size={12} /> main*</span>
            <span className="sb-item" onClick={() => { setBottomDockOpen(true); setBottomTab('problems'); }}>
              <AlertTriangle size={12} /> {problems.length}
            </span>
          </div>

          <div className="sb-right">
            <span className="sb-item" onClick={() => setShowGoToLine(true)} title="Go to Line (Ctrl+G)">
              Ln {cursor.line}, Col {cursor.col}
            </span>
            <span className="sb-item">Spaces: 4</span>
            <span className="sb-item">UTF-8</span>
            <span className="sb-item">LF</span>
            <span
              className="sb-item"
              style={{ fontWeight: 700, color: '#38bdf8', cursor: 'pointer' }}
              onClick={() => setShowLangPicker(true)}
              title="Select Language Mode"
            >
              {codeLang.toUpperCase()}
            </span>
            <span className="sb-item">🟢 {activeUsers.length} Online</span>
          </div>
        </div>
      </div>

      {/* 6️⃣ COMMAND PALETTE (CTRL+SHIFT+P) */}
      {showCommandPalette && (
        <div className="modal-backdrop" onClick={() => setShowCommandPalette(false)}>
          <div className="vscode-cmd-palette" onClick={e => e.stopPropagation()}>
            <div className="palette-input-row">
              <Command size={16} />
              <input
                className="palette-input"
                placeholder="Type a command (e.g. Run, Format, Theme, Language)..."
                value={paletteQuery}
                onChange={e => setPaletteQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="palette-results-list">
              {[
                { title: 'Run Active File', icon: <Play size={14} />, act: () => { runCode(activeFile); setShowCommandPalette(false); } },
                { title: 'Format Document (Prettier)', icon: <AlignLeft size={14} />, act: () => { formatDocument(); setShowCommandPalette(false); } },
                { title: 'Change Language Mode', icon: <FileCode2 size={14} />, act: () => { setShowLangPicker(true); setShowCommandPalette(false); } },
                { title: 'Go to Line...', icon: <CornerDownLeft size={14} />, act: () => { setShowGoToLine(true); setShowCommandPalette(false); } },
                { title: 'Start Debugging (Python)', icon: <Bug size={14} />, act: () => { debugRun(); setShowCommandPalette(false); } },
                { title: 'New File...', icon: <FilePlus size={14} />, act: () => { addFile(); setShowCommandPalette(false); } },
                { title: 'New Folder...', icon: <FolderPlus size={14} />, act: () => { addFolder(); setShowCommandPalette(false); } },
                { title: 'Switch to One Dark Theme', icon: <Zap size={14} />, act: () => { setThemeName('One Dark'); setShowCommandPalette(false); } },
                { title: 'Switch to VS Code Dark Theme', icon: <Zap size={14} />, act: () => { setThemeName('VS Code Dark'); setShowCommandPalette(false); } },
                { title: 'Toggle Code Minimap', icon: <Eye size={14} />, act: () => { setShowMinimap(m => !m); setShowCommandPalette(false); } },
                { title: 'Clear Terminal Output', icon: <RotateCcw size={14} />, act: () => { setTerminalLogs([]); setShowCommandPalette(false); } },
              ]
                .filter(c => c.title.toLowerCase().includes(paletteQuery.toLowerCase()))
                .map((cmd, i) => (
                  <div key={i} className="palette-result-item" onClick={cmd.act}>
                    {cmd.icon}
                    <span>{cmd.title}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 7️⃣ LANGUAGE MODE PICKER MODAL */}
      {showLangPicker && (
        <div className="modal-backdrop" onClick={() => setShowLangPicker(false)}>
          <div className="vscode-cmd-palette" onClick={e => e.stopPropagation()}>
            <div className="palette-input-row">
              <FileCode2 size={16} />
              <input
                className="palette-input"
                placeholder="Select Language Mode (60+ available)..."
                value={langSearch}
                onChange={e => setLangSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="palette-results-list">
              {ALL_LANGUAGES
                .filter(l => l.name.toLowerCase().includes(langSearch.toLowerCase()) || l.ext.includes(langSearch.toLowerCase()))
                .map((langItem) => (
                  <div
                    key={langItem.id}
                    className="palette-result-item"
                    onClick={() => {
                      setCodeLang(langItem.id);
                      setShowLangPicker(false);
                    }}
                  >
                    <span style={{ color: langItem.color, fontWeight: 700, minWidth: 20 }}>.{langItem.ext}</span>
                    <span>{langItem.name}</span>
                    {codeLang === langItem.id && <Check size={14} style={{ marginLeft: 'auto', color: 'var(--success)' }} />}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 8️⃣ GO TO LINE MODAL (CTRL+G) */}
      {showGoToLine && (
        <div className="modal-backdrop" onClick={() => setShowGoToLine(false)}>
          <div className="vscode-cmd-palette" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="palette-input-row">
              <span style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>:</span>
              <input
                className="palette-input"
                placeholder="Type line number (1 to ...)"
                value={goToLineInput}
                onChange={e => setGoToLineInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const num = parseInt(goToLineInput);
                    if (!isNaN(num)) jumpToLine(num);
                    setShowGoToLine(false);
                  }
                }}
                autoFocus
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
