import { ViewPlugin, Decoration, MatchDecorator } from '@codemirror/view';
const matcher = new MatchDecorator({ regexp: /TODO|FIXME|HACK/gi, decoration: () => Decoration.mark({ class: 'todo-mark' }) });
export const todoHighlight = ViewPlugin.fromClass(class {
  constructor(v) { this.dec = matcher.createDeco(v); }
  update(u) { this.dec = matcher.updateDeco(u, this.dec); }
}, { decorations: (v) => v.dec });