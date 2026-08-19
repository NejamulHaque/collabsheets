const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const router = express.Router();

// We only advertise languages that can run locally out-of-the-box
const VERSIONS = {
  python: '3.x (Local)',
  javascript: 'Node.js (Local)',
  bash: 'Bash (Local)'
};

// 1️⃣ GET /execute/runtimes (Populates the language dropdown in the UI)
router.get('/runtimes', (req, res) => {
  res.json(Object.entries(VERSIONS).map(([language, version]) => ({ language, version })));
});

// 2️⃣ GET /execute/history/:docId
router.get('/history/:docId', (req, res) => res.json([]));

// 3️⃣ POST /execute (Local Code Execution Engine)
router.post('/', async (req, res) => {
  const { language, code, stdin = '' } = req.body;
  
    // ✅ NEW CODE (Only blocks if code is truly undefined/null)
  if (!language || code === undefined || code === null) {
    return res.json({ run: { stdout: '', stderr: 'Missing language or code.', code: 1, runtime: 0 } });
  }

  // Create a secure temporary directory for the execution
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-exec-'));
  let fileName, command, args;

  if (language === 'python') {
    fileName = 'main.py';
    // Windows uses 'python', Mac/Linux uses 'python3'
    command = process.platform === 'win32' ? 'python' : 'python3';
    args = [path.join(tmpDir, fileName)];
  } else if (language === 'javascript') {
    fileName = 'main.js';
    command = 'node';
    args = [path.join(tmpDir, fileName)];
  } else if (language === 'bash') {
    fileName = 'main.sh';
    command = 'bash';
    args = [path.join(tmpDir, fileName)];
  } else {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return res.json({
      run: {
        stdout: '',
        stderr: `⚠️ Local execution for "${language}" is not configured.\nCurrently supporting Python, JavaScript, and Bash locally.`,
        code: 1,
        runtime: 0
      }
    });
  }

  const filePath = path.join(tmpDir, fileName);
  fs.writeFileSync(filePath, code);

  let stdout = '';
  let stderr = '';
  let exitCode = 0;

  try {
    // Spawn the child process with a 10-second timeout to prevent infinite loops
    const child = spawn(command, args, {
      cwd: tmpDir,
      env: { ...process.env, PYTHONUNBUFFERED: '1', FORCE_COLOR: '0' },
      timeout: 10000 
    });

    // Pass standard input if provided
    if (stdin) {
      child.stdin.write(stdin);
      child.stdin.end();
    }

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    exitCode = await new Promise((resolve) => {
      child.on('close', (code) => resolve(code ?? 1));
      child.on('error', (err) => {
        stderr += `\n❌ Failed to start ${command}: ${err.message}\n(Make sure ${command} is installed and added to your system PATH)`;
        resolve(1);
      });
    });

  } catch (err) {
    stderr += `\nExecution error: ${err.message}`;
    exitCode = 1;
  } finally {
    // Clean up the temporary files securely
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }

  // Always return 200 OK, put errors in stderr so the UI terminal displays them
  res.json({
    run: {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      code: exitCode,
      runtime: 50
    }
  });
});

module.exports = router;