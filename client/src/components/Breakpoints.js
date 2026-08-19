import { StateField, StateEffect, RangeSet } from '@codemirror/state';
import { gutter, GutterMarker } from '@codemirror/view';

class BpMarker extends GutterMarker {
  elementClass = 'cm-breakpoint';
}

const toggleBp = StateEffect.define();

const bpField = StateField.define({
  create: () => RangeSet.empty,
  update(set, tr) {
    set = set.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(toggleBp)) {
        const pos = e.value;
        let found = false;
        set.between(pos, pos, () => { found = true; });
        set = found
          ? set.update({ filter: (from) => from !== pos })
          : set.update({ add: [new BpMarker().range(pos)], sort: true });
      }
    }
    return set;
  },
});

export const bpGutter = gutter({
  class: 'cm-bp-gutter',
  markers: (v) => v.state.field(bpField),
  initialSpacer: () => new BpMarker(),
  domEventHandlers: {
    click: (view, line) => {
      view.dispatch({ effects: toggleBp.of(view.state.doc.lineAt(line.from).from) });
      return true;
    },
  },
});

export const breakpointsExt = [bpField, bpGutter];

export const getBreakpointLines = (view) => {
  const lines = [];
  view.state.field(bpField, false)?.between(0, view.state.doc.length, (from) => {
    lines.push(view.state.doc.lineAt(from).number);
  });
  return lines.sort((a, b) => a - b);
};