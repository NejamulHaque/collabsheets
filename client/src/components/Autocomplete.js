import { StateField, StateEffect } from '@codemirror/state';
import { EditorView, WidgetType, keymap, Decoration } from '@codemirror/view';

class GhostWidget extends WidgetType {
  constructor(text) { super(); this.text = text; }
  eq(o) { return o.text === this.text; }
  toDOM() { const s = document.createElement('span'); s.className = 'ghost-text'; s.textContent = this.text; return s; }
  ignoreEvent() { return true; }
}

const setGhost = StateEffect.define();
const ghostField = StateField.define({
  create: () => ({ text: '', at: 0 }),
  update(v, tr) {
    for (const e of tr.effects) if (e.is(setGhost)) v = e.value;
    if (tr.docChanged) v = { text: '', at: 0 };
    return v;
  },
  provide: f => EditorView.decorations.from(f, v =>
    v.text ? Decoration.set([Decoration.widget({ widget: new GhostWidget(v.text), side: 1 }).range(v.at)]) : Decoration.none),
});

export const acceptGhost = (view) => {
  const { text, at } = view.state.field(ghostField);
  if (!text) return false;
  view.dispatch({ changes: { from: at, insert: text }, selection: { anchor: at + text.length }, effects: setGhost.of({ text: '', at: 0 }) });
  return true;
};

const KEYWORDS = ['print','function','const','let','return','if','else','for','while','import','from','def','class','range','len','append','map','filter','lambda','async','await','try','except','catch','throw','new','this','self','true','false','None','null','undefined'];

function suggest(view) {
  const { from, to } = view.state.selection.main;
  if (from !== to) return;
  const line = view.state.doc.lineAt(from);
  const before = line.text.slice(0, from - line.from);
  const m = before.match(/[\w]+$/);
  if (!m || m[0].length < 2) return view.dispatch({ effects: setGhost.of({ text: '', at: from }) });
  const token = m[0];
  const words = new Set(KEYWORDS);
  (view.state.doc.toString().match(/[\w]+/g) || []).forEach(w => words.add(w));
  let best = '';
  for (const w of words) if (w.startsWith(token) && w !== token && (!best || w.length < best.length)) best = w;
  view.dispatch({ effects: setGhost.of({ text: best ? best.slice(token.length) : '', at: from }) });
}

export function autocomplete() {
  let t;
  return [
    ghostField,
    EditorView.updateListener.of(u => {
      if (u.docChanged || u.selectionSet) { clearTimeout(t); t = setTimeout(() => suggest(u.view), 250); }
    }),
    keymap.of([{ key: 'Tab', run: acceptGhost }]),
  ];
}