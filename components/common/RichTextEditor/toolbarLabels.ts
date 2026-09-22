/**
 * Toolbar labels, in one place.
 *
 * The editor is an admin-only control and the admin area is deliberately kept
 * out of the five locale files (`ai-context/translation-rules.md`), so these
 * stay plain English. Holding them here rather than inline means the day the
 * admin does get translated, this is the only file that changes.
 */
export const TOOLBAR_LABELS = {
  bold: 'Bold',
  italic: 'Italic',
  underline: 'Underline',
  strikethrough: 'Strikethrough',
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  bulletList: 'Bullet list',
  orderedList: 'Ordered list',
  blockquote: 'Blockquote',
  codeBlock: 'Code block',
  alignLeft: 'Align left',
  alignCenter: 'Align center',
  alignRight: 'Align right',
  alignJustify: 'Justify',
  insertImage: 'Insert image',
  insertLink: 'Insert link',
  undo: 'Undo',
  redo: 'Redo',
  toolbar: 'Text formatting',
  linkPrompt: 'Enter URL',
} as const;
