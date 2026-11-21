// CodeMirror dark theme for both playgrounds: oneDark with two contrast fixes for WCAG AA.
import {Prec} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {HighlightStyle, syntaxHighlighting} from '@codemirror/language';
import {tags} from '@lezer/highlight';
import {oneDark} from '@codemirror/theme-one-dark';

// oneDark's coral for names (#e06c75) is 4.4:1 on its background; lighten it.
const darkNames = Prec.highest(
  syntaxHighlighting(
    HighlightStyle.define([
      {
        tag: [tags.name, tags.propertyName, tags.character, tags.deleted, tags.macroName],
        color: '#ef8891',
      },
    ]),
  ),
);
// oneDark's active-line tint drops keyword contrast below 4.5:1; keep the plain background.
const darkActiveLine = Prec.highest(
  EditorView.theme({'.cm-activeLine': {backgroundColor: '#282c34'}}, {dark: true}),
);

export const darkEditorTheme = [oneDark, darkActiveLine, darkNames];
