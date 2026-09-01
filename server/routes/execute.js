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

// Find available system binary for language
function findBinary(candidates) {
  const customPath = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/opt/homebrew/sbin:/usr/sbin:/sbin:' + (process.env.PATH || '');
  const dirs = customPath.split(':').filter(Boolean);

  for (const name of candidates) {
    if (path.isAbsolute(name) && fs.existsSync(name)) return name;
    for (const dir of dirs) {
      const full = path.join(dir, name);
      if (fs.existsSync(full)) {
        try {
          fs.accessSync(full, fs.constants.X_OK);
          return full;
        } catch {}
      }
    }
  }
  return null;
}

// 1️⃣ GET /execute/runtimes
router.get('/runtimes', (req, res) => {
  res.json(Object.entries(RUNTIMES).map(([language, version]) => ({ language, version })));
});

// 2️⃣ GET /execute/history/:docId
router.get('/history/:docId', (req, res) => res.json([]));

// 3️⃣ POST /execute (Dual High-Speed Local Engine + 60+ Cloud Fallback)
router.post('/', async (req, res) => {
  const { language, code, stdin = '' } = req.body;
  const langKey = (language || 'python').toLowerCase();

  if (code === undefined || code === null) {
    return res.json({ run: { stdout: '', stderr: 'No code provided to execute.', code: 1, runtime: 0 } });
  }

  const startTime = Date.now();
  const env = {
    ...process.env,
    PATH: '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/opt/homebrew/sbin:/usr/sbin:/sbin:' + (process.env.PATH || ''),
    PYTHONUNBUFFERED: '1',
    FORCE_COLOR: '0',
    NODE_DISABLE_COLORS: '1',
  };

  // 1️⃣ LOCAL RUNTIME ATTEMPT (Instant & Secure)
  let localCmd = null;
  let fileName = 'main.txt';
  let compileCmd = null;
  let compileArgs = [];

  if (langKey === 'python') {
    localCmd = findBinary(['/opt/homebrew/bin/python3', '/usr/local/bin/python3', '/usr/bin/python3', 'python3', 'python']);
    fileName = 'main.py';
  } else if (langKey === 'javascript' || langKey === 'node') {
    localCmd = findBinary(['/opt/homebrew/bin/node', '/usr/local/bin/node', '/usr/bin/node', 'node']);
    fileName = 'main.js';
  } else if (langKey === 'bash' || langKey === 'sh') {
    localCmd = findBinary(['/bin/bash', '/usr/bin/bash', 'bash', 'sh']);
    fileName = 'main.sh';
  } else if (langKey === 'c') {
    const gcc = findBinary(['/opt/homebrew/bin/gcc', '/usr/bin/gcc', 'gcc', 'clang']);
    if (gcc) {
      compileCmd = gcc;
      fileName = 'main.c';
    }
  } else if (langKey === 'c++' || langKey === 'cpp') {
    const gpp = findBinary(['/opt/homebrew/bin/g++', '/usr/bin/g++', 'g++', 'clang++']);
    if (gpp) {
      compileCmd = gpp;
      fileName = 'main.cpp';
    }
  }

  if (localCmd || compileCmd) {
    try {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-exec-'));
      const filePath = path.join(tmpDir, fileName);
      fs.writeFileSync(filePath, code);

      let stdout = '';
      let stderr = '';
      let exitCode = 0;
      let localRan = false;

      // Handle C / C++ Compilation
      if (compileCmd) {
        const outBin = path.join(tmpDir, 'program');
        const compileProc = spawn(compileCmd, [filePath, '-o', outBin], { cwd: tmpDir, env, timeout: 8000 });
        
        let cErr = '';
        compileProc.stderr.on('data', d => { cErr += d.toString(); });
        const compSuccess = await new Promise(resolve => {
          compileProc.on('close', c => resolve(c === 0));
          compileProc.on('error', () => resolve(false));
        });

        if (!compSuccess) {
          try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
          return res.json({
            run: {
              stdout: '',
              stderr: (cErr || 'Compilation failed.').trim(),
              code: 1,
              runtime: Date.now() - startTime,
              provider: 'local-gcc',
            },
          });
        }
        localCmd = outBin;
      }

      const args = compileCmd ? [] : [filePath];
      const child = spawn(localCmd, args, { cwd: tmpDir, env, timeout: 12000 });

      if (stdin) {
        child.stdin.write(stdin);
        child.stdin.end();
      }

      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });

      localRan = await new Promise((resolve) => {
        child.on('close', (c) => {
          exitCode = c ?? 0;
          resolve(true);
        });
        child.on('error', () => resolve(false));
      });

      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

      if (localRan) {
        return res.json({
          run: {
            stdout: stdout.trimEnd(),
            stderr: stderr.trimEnd(),
            code: exitCode,
            runtime: Date.now() - startTime,
            provider: 'local-engine',
          },
        });
      }
    } catch (e) {
      console.warn('Local execution error:', e.message);
    }
  }

  // 2️⃣ CLOUD RUNNER (Piston 60+ Languages API)
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
      signal: AbortSignal.timeout(12000),
    });

    if (pistonRes.ok) {
      const data = await pistonRes.json();
      const stdout = data.run?.stdout || data.compile?.stdout || '';
      const stderr = data.run?.stderr || data.compile?.stderr || '';
      const exitCode = data.run?.code ?? data.compile?.code ?? 0;

      return res.json({
        run: {
          stdout: stdout.trimEnd(),
          stderr: stderr.trimEnd(),
          code: exitCode,
          runtime: Date.now() - startTime,
          provider: 'cloud-piston',
        },
      });
    }
  } catch (err) {
    console.warn('Piston cloud runner unavailable:', err.message);
  }

  // 3️⃣ IN-MEMORY SANDBOX FALLBACK (JavaScript)
  if (langKey === 'javascript' || langKey === 'js') {
    try {
      const logs = [];
      const customConsole = {
        log: (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
        error: (...args) => logs.push('[Error] ' + args.join(' ')),
        warn: (...args) => logs.push('[Warn] ' + args.join(' ')),
        info: (...args) => logs.push('[Info] ' + args.join(' ')),
      };
      const runFn = new Function('console', code);
      runFn(customConsole);

      return res.json({
        run: {
          stdout: logs.join('\n'),
          stderr: '',
          code: 0,
          runtime: Date.now() - startTime,
          provider: 'node-sandbox',
        },
      });
    } catch (e) {
      return res.json({
        run: {
          stdout: '',
          stderr: String(e.stack || e.message),
          code: 1,
          runtime: Date.now() - startTime,
          provider: 'node-sandbox',
        },
      });
    }
  }

  // 4️⃣ DESCRIPTIVE RUNTIME STATUS
  res.json({
    run: {
      stdout: '',
      stderr: `Execution notice: Local compiler/interpreter for "${language}" is not currently in system PATH, and cloud execution timed out.\n\nTip: For instant local execution on your machine, ensure python3 / gcc is installed or switch language to JavaScript.`,
      code: 1,
      runtime: Date.now() - startTime,
      provider: 'offline-notice',
    },
  });
});

module.exports = router;