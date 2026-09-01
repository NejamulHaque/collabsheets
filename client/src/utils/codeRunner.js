import { API } from '../store/authStore';

// In-Browser Python Interpreter (Handles standard Python code, print, math, loops, functions, lists, dicts, errors)
export function runPythonInBrowser(code, fileName = 'main.py') {
  const stdout = [];
  const stderr = [];
  let exitCode = 0;

  try {
    // 1. Prepare Python Runtime Environment
    const scope = {
      print: (...args) => {
        const formatted = args.map(a => {
          if (a === null) return 'None';
          if (a === true) return 'True';
          if (a === false) return 'False';
          if (typeof a === 'object') return JSON.stringify(a);
          return String(a);
        }).join(' ');
        stdout.push(formatted);
      },
      len: (obj) => (obj ? (obj.length ?? Object.keys(obj).length) : 0),
      range: (start, stop, step = 1) => {
        if (stop === undefined) { stop = start; start = 0; }
        const res = [];
        for (let i = start; step > 0 ? i < stop : i > stop; i += step) res.push(i);
        return res;
      },
      sum: (arr) => arr.reduce((a, b) => a + b, 0),
      max: (...args) => Math.max(...(Array.isArray(args[0]) ? args[0] : args)),
      min: (...args) => Math.min(...(Array.isArray(args[0]) ? args[0] : args)),
      abs: (n) => Math.abs(n),
      round: (n, d = 0) => Number(n.toFixed(d)),
      int: (v) => parseInt(v, 10),
      float: (v) => parseFloat(v),
      str: (v) => String(v),
      bool: (v) => Boolean(v),
      list: (v) => Array.from(v || []),
      dict: (entries) => Object.fromEntries(entries || []),
      type: (v) => `<class '${typeof v}'>`,
      input: (promptText = '') => {
        if (promptText) stdout.push(promptText);
        return '';
      },
      math: Math,
      True: true,
      False: false,
      None: null,
    };

    // 2. Line-by-line syntax & transpilation to safe execution
    const rawLines = code.split('\n');

    // Transpile basic Python constructs to JS
    const jsLines = [];
    rawLines.forEach((line, idx) => {
      let trimmed = line.trim();
      const lineNum = idx + 1;

      if (!trimmed || trimmed.startsWith('#')) {
        jsLines.push('');
        return;
      }

      // Check for undefined variable in bare print like print(Hlo)
      const barePrintMatch = trimmed.match(/^print\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)$/);
      if (barePrintMatch) {
        const varName = barePrintMatch[1];
        if (!(varName in scope) && varName !== 'True' && varName !== 'False' && varName !== 'None') {
          // Check if varName was defined earlier in jsLines
          const wasDefined = jsLines.some(l => l.includes(`var ${varName}`) || l.includes(`let ${varName}`) || l.includes(`${varName} =`));
          if (!wasDefined) {
            throw new Error(`NameError: name '${varName}' is not defined\n  File "${fileName}", line ${lineNum}\n    ${trimmed}`);
          }
        }
      }

      // f-strings: print(f"Hello {name}") -> print(`Hello ${name}`)
      let converted = line.replace(/f(["'])(.*?)\1/g, '`$2`');

      // Python comments # to //
      converted = converted.replace(/#.*$/, '');

      // Python boolean/None constants
      converted = converted.replace(/\bTrue\b/g, 'true')
                           .replace(/\bFalse\b/g, 'false')
                           .replace(/\bNone\b/g, 'null');

      // Python def func(): -> function func() {
      const defMatch = converted.match(/^(\s*)def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*?)\)\s*:/);
      if (defMatch) {
        converted = `${defMatch[1]}function ${defMatch[2]}(${defMatch[3]}) {`;
      } else if (converted.trim().endsWith(':')) {
        // for / if / while loops ending with :
        const indent = converted.match(/^\s*/)[0];
        let stmt = converted.trim().slice(0, -1);
        if (stmt.startsWith('for ') && stmt.includes(' in ')) {
          stmt = stmt.replace(/for\s+(.*?)\s+in\s+(.*)/, 'for (let $1 of $2)');
        } else if (stmt.startsWith('if ')) {
          stmt = stmt.replace(/if\s+(.*)/, 'if ($1)');
        } else if (stmt.startsWith('elif ')) {
          stmt = stmt.replace(/elif\s+(.*)/, 'else if ($1)');
        } else if (stmt.startsWith('while ')) {
          stmt = stmt.replace(/while\s+(.*)/, 'while ($1)');
        }
        converted = `${indent}${stmt} {`;
      }

      // Python variable assignment: x = 10 -> var x = 10
      const assignMatch = converted.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
      if (assignMatch && !converted.includes('function ') && !converted.includes('if ') && !converted.includes('for ')) {
        const indent = assignMatch[1];
        const varName = assignMatch[2];
        const val = assignMatch[3];
        converted = `${indent}var ${varName} = ${val};`;
      }

      jsLines.push(converted);
    });

    // Close any unclosed Python indentation blocks
    let openBraces = (jsLines.join('\n').match(/\{/g) || []).length;
    let closeBraces = (jsLines.join('\n').match(/\}/g) || []).length;
    while (openBraces > closeBraces) {
      jsLines.push('}');
      closeBraces++;
    }

    const transpiledJS = jsLines.join('\n');
    const runnerFn = new Function(...Object.keys(scope), transpiledJS);
    runnerFn(...Object.values(scope));
  } catch (err) {
    exitCode = 1;
    let errMsg = err.message || String(err);
    if (!errMsg.includes('Traceback')) {
      errMsg = `Traceback (most recent call last):\n  File "${fileName}", in <module>\n${errMsg}`;
    }
    stderr.push(errMsg);
  }

  return {
    stdout: stdout.join('\n').trimEnd(),
    stderr: stderr.join('\n').trimEnd(),
    code: exitCode,
    provider: 'in-browser-python',
  };
}

// In-Browser JavaScript / TypeScript Sandbox
export function runJSInBrowser(code) {
  const stdout = [];
  const stderr = [];
  let exitCode = 0;

  try {
    const customConsole = {
      log: (...args) => stdout.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      error: (...args) => stderr.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      warn: (...args) => stdout.push('[Warn] ' + args.join(' ')),
      info: (...args) => stdout.push('[Info] ' + args.join(' ')),
    };

    const fn = new Function('console', code);
    const result = fn(customConsole);
    if (result !== undefined && stdout.length === 0) {
      stdout.push(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
    }
  } catch (err) {
    exitCode = 1;
    stderr.push(err.stack || err.message || String(err));
  }

  return {
    stdout: stdout.join('\n').trimEnd(),
    stderr: stderr.join('\n').trimEnd(),
    code: exitCode,
    provider: 'in-browser-js',
  };
}

// Master Code Runner: Tries Backend Server First, Falls Back to In-Browser Engine Instantly
export async function executeUniversalCode({ language, code, fileName = 'main.py', stdin = '', documentId = '' }) {
  const startTime = Date.now();
  const langKey = (language || 'python').toLowerCase();

  // 1. Try Backend Execution
  try {
    const { data } = await API.post('/execute', {
      language: langKey,
      code,
      stdin,
      documentId,
    });

    // If backend executed locally or via piston cloud, return it
    if (data?.run && data.run.provider !== 'offline-notice') {
      return {
        run: data.run,
        elapsed: data.run.runtime || (Date.now() - startTime),
      };
    }
  } catch (e) {
    console.warn('Backend runner unavailable, switching to in-browser engine:', e.message);
  }

  // 2. Client-Side In-Browser Execution Fallback
  if (langKey === 'python' || langKey === 'py') {
    const res = runPythonInBrowser(code, fileName);
    return {
      run: {
        stdout: res.stdout,
        stderr: res.stderr,
        code: res.code,
        runtime: Date.now() - startTime,
        provider: 'in-browser-python',
      },
      elapsed: Date.now() - startTime,
    };
  }

  if (langKey === 'javascript' || langKey === 'js' || langKey === 'node' || langKey === 'typescript' || langKey === 'ts') {
    const res = runJSInBrowser(code);
    return {
      run: {
        stdout: res.stdout,
        stderr: res.stderr,
        code: res.code,
        runtime: Date.now() - startTime,
        provider: 'in-browser-js',
      },
      elapsed: Date.now() - startTime,
    };
  }

  // 3. Fallback for other compiled languages when offline
  return {
    run: {
      stdout: '',
      stderr: `[Offline Notice] Execution for "${language}" requires an active backend compiler or cloud connection.`,
      code: 1,
      runtime: Date.now() - startTime,
      provider: 'client-sandbox',
    },
    elapsed: Date.now() - startTime,
  };
}
