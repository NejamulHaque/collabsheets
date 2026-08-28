export function reviewCode(code, lang) {
  const out = [];
  if (!code || typeof code !== 'string') return out;

  code.split('\n').forEach((line, i) => {
    const n = i + 1;
    // Check for real issues only
    if (/[^=!<>]==[^=]/.test(line) && /javascript|typescript|js|ts/.test(lang)) {
      out.push({ n, sev: 'error', msg: 'Use strict equality (===) instead of abstract equality (==)' });
    }
    if (/except\s*:/.test(line) && /python/.test(lang)) {
      out.push({ n, sev: 'warn', msg: 'Bare except clause — catch specific exceptions (e.g. except Exception as e:)' });
    }
    if (/catch\s*\(\s*\)\s*\{/.test(line) && /javascript|typescript|js|ts/.test(lang)) {
      out.push({ n, sev: 'warn', msg: 'Empty catch block' });
    }
  });

  return out;
}