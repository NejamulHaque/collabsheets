import { Extension } from '@tiptap/core';
import TextStyle from '@tiptap/extension-text-style';

export const CustomTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontFamily: {
        parseHTML: el => el.style.fontFamily || null,
        renderHTML: attrs => attrs.fontFamily ? { style: `font-family: ${attrs.fontFamily}` } : {},
      },
      fontSize: {
        parseHTML: el => el.style.fontSize || null,
        renderHTML: attrs => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
      },
    };
  },
});

export const FontFamily = Extension.create({
  name: 'fontFamily',
  addCommands() {
    return { setFontFamily: fontFamily => ({ chain }) => chain().setMark('textStyle', { fontFamily }).run() };
  },
});

export const FontSize = Extension.create({
  name: 'fontSize',
  addCommands() {
    return { setFontSize: fontSize => ({ chain }) => chain().setMark('textStyle', { fontSize }).run() };
  },
});