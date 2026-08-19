export function reviewCode(code, lang) {
  const out = [];
  code.split('\n').forEach((line, i) => {
    const n = i + 1;
    if (/console\.log/.test(line)) out.push({ n, sev: 'warn', msg: 'console.log left in code' });
    if (/[^=!<>]==[^=]/.test(line) && /javascript|typescript|js|ts/.test(lang)) out.push({ n, sev: 'error', msg: 'Use === instead of ==' });
    if (/\bvar\s/.test(line) && /javascript|js/.test(lang)) out.push({ n, sev: 'warn', msg: 'Prefer let/const over var' });
    if (/TODO|FIXME/.test(line)) out.push({ n, sev: 'info', msg: 'Unresolved TODO/FIXME' });
    if (line.length > 100) out.push({ n, sev: 'info', msg: 'Line too long (>100 chars)' });
    if (/except:/.test(line) && /python/.test(lang)) out.push({ n, sev: 'warn', msg: 'Bare except — catch specific errors' });
  });
  if (!out.length) out.push({ n: 0, sev: 'ok', msg: 'No issues found — clean code! 🎉' });
  return out;
}