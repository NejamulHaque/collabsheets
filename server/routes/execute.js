const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const router = express.Router();

// Supported runtimes
const RUNTIMES = {
  python: '3.11.x',
  javascript: 'Node.js 20.x',
  typescript: '5.x',
  c: 'GCC 13.x',
  'c++': 'G++ 13.x',
  cpp: 'G++ 13.x',
  java: 'OpenJDK 21',
  rust: '1.75.x',
  go: '1.21.x',
  php: '8.3.x',
  ruby: '3.2.x',
  bash: '5.2.x',
  sh: '5.2.x',
  perl: '5.38.x',
  sql: 'SQLite 3.x',
  lua: '5.4.x',
  r: '4.3.x',
  swift: '5.9.x',
  kotlin: '1.9.x',
};

// Piston language map for cloud fallback
const PISTON_LANG_MAP = {
  python: { language: 'python', version: '3.10.0', file: 'main.py' },
  javascript: { language: 'javascript', version: '18.15.0', file: 'main.js' },
  typescript: { language: 'typescript', version: '5.0.3', file: 'main.ts' },
  c: { language: 'c', version: '10.2.0', file: 'main.c' },
  'c++': { language: 'c++', version: '10.2.0', file: 'main.cpp' },
  cpp: { language: 'c++', version: '10.2.0', file: 'main.cpp' },
  java: { language: 'java', version: '15.0.2', file: 'Main.java' },
  rust: { language: 'rust', version: '1.68.2', file: 'main.rs' },
  go: { language: 'go', version: '1.16.2', file: 'main.go' },
  php: { language: 'php', version: '8.2.3', file: 'main.php' },
  ruby: { language: 'ruby', version: '3.0.1', file: 'main.rb' },
  bash: { language: 'bash', version: '5.2.0', file: 'main.sh' },
  sh: { language: 'bash', version: '5.2.0', file: 'main.sh' },
  perl: { language: 'perl', version: '5.36.0', file: 'main.pl' },
  sqlite3: { language: 'sqlite3', version: '3.36.0', file: 'main.sql' },
  sql: { language: 'sqlite3', version: '3.36.0', file: 'main.sql' },
  lua: { language: 'lua', version: '5.4.4', file: 'main.lua' },
  r: { language: 'r', version: '4.1.1', file: 'main.r' },
  swift: { language: 'swift', version: '5.3.3', file: 'main.swift' },
  kotlin: { language: 'kotlin', version: '1.8.20', file: 'Main.kt' },
};

// 1️⃣ GET /execute/runtimes
router.get('/runtimes', (req, res) => {
  res.json(Object.entries(RUNTIMES).map(([language, version]) => ({ language, version })));
});

// 2️⃣ GET /execute/history/:docId
router.get('/history/:docId', (req, res) => res.json([]));

// 3️⃣ POST /execute (Dual Local + Global Cloud Code Runner)
router.post('/', async (req, res) => {
  const { language, code, stdin = '' } = req.body;
  const langKey = (language || 'python').toLowerCase();

  if (code === undefined || code === null) {
    return res.json({ run: { stdout: '', stderr: 'No code provided to execute.', code: 1, runtime: 0 } });
  }

  const startTime = Date.now();

  // Try Local Execution first for Python / JavaScript / Bash
  if (['python', 'javascript', 'bash', 'sh'].includes(langKey)) {
    try {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-exec-'));
      let fileName = 'main.py';
      let command = process.platform === 'win32' ? 'python' : 'python3';
      let args = [];

      if (langKey === 'python') {
        fileName = 'main.py';
        command = process.platform === 'win32' ? 'python' : 'python3';
      } else if (langKey === 'javascript') {
        fileName = 'main.js';
        command = 'node';
      } else if (langKey === 'bash' || langKey === 'sh') {
        fileName = 'main.sh';
        command = 'bash';
      }

      const filePath = path.join(tmpDir, fileName);
      fs.writeFileSync(filePath, code);
      args = [filePath];

      let stdout = '';
      let stderr = '';
      let exitCode = 0;

      const child = spawn(command, args, {
        cwd: tmpDir,
        env: { ...process.env, PYTHONUNBUFFERED: '1', FORCE_COLOR: '0' },
        timeout: 12000,
      });

      if (stdin) {
        child.stdin.write(stdin);
        child.stdin.end();
      }

      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });

      const localRan = await new Promise((resolve) => {
        child.on('close', (c) => resolve(true));
        child.on('error', () => resolve(false));
      });

      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

      if (localRan) {
        return res.json({
          run: {
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            code: exitCode,
            runtime: Date.now() - startTime,
            provider: 'local-sandbox',
          },
        });
      }
    } catch {}
  }

  // Cloud Runner Fallback for all 60+ languages via Piston API
  const pistonConfig = PISTON_LANG_MAP[langKey] || { language: langKey, version: '*', file: `main.${langKey}` };

  try {
    const pistonRes = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: pistonConfig.language,
        version: pistonConfig.version,
        files: [{ name: pistonConfig.file, content: code }],
        stdin,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (pistonRes.ok) {
      const data = await pistonRes.json();
      const stdout = data.run?.stdout || data.compile?.stdout || '';
      const stderr = data.run?.stderr || data.compile?.stderr || '';
      const exitCode = data.run?.code ?? data.compile?.code ?? 0;

      return res.json({
        run: {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          code: exitCode,
          runtime: Date.now() - startTime,
          provider: 'piston-cloud',
        },
      });
    }
  } catch (err) {
    console.warn('Piston cloud runner unavailable:', err.message);
  }

  // Pure in-memory JS fallback if running JavaScript
  if (langKey === 'javascript') {
    try {
      const logs = [];
      const customConsole = {
        log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
        error: (...args) => logs.push('[ERROR] ' + args.join(' ')),
        warn: (...args) => logs.push('[WARN] ' + args.join(' ')),
      };
      const runFn = new Function('console', code);
      runFn(customConsole);

      return res.json({
        run: {
          stdout: logs.join('\n'),
          stderr: '',
          code: 0,
          runtime: Date.now() - startTime,
          provider: 'js-sandbox',
        },
      });
    } catch (e) {
      return res.json({
        run: {
          stdout: '',
          stderr: String(e.stack || e.message),
          code: 1,
          runtime: Date.now() - startTime,
        },
      });
    }
  }

  res.json({
    run: {
      stdout: '',
      stderr: `Execution finished. Could not connect to remote compiler for "${language}".`,
      code: 1,
      runtime: Date.now() - startTime,
    },
  });
});

module.exports = router;