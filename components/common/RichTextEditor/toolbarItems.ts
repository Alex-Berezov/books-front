import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo,
} from 'lucide-react';
import type { HeadingLevel, TextAlignment, ToolbarState } from './useToolbarState';
import type { Editor } from '@tiptap/react';
import type { LucideIcon } from 'lucide-react';
import { TOOLBAR_LABELS } from './toolbarLabels';

/**
 * One toolbar button, described rather than hand-written.
 *
 * Command and active flag sit on the same line on purpose: nineteen copies of
 * the same JSX block is exactly how a button ends up running `toggleBold` while
 * highlighting from `isItalic` - a mismatch that costs nothing at compile time
 * and shows up only as a button lighting at the wrong moment.
 */
export interface ToolbarItem {
  key: string;
  icon: LucideIcon;
  label: string;
  run: (editor: Editor) => void;
  /** Absent means the button has no pressed state (undo, redo). */
  isActive?: (state: ToolbarState) => boolean;
  /** Absent means the command is always available while the editor is editable. */
  isEnabled?: (state: ToolbarState) => boolean;
}

// 🔴 `setTextAlign` is typed `(alignment: string)` by tiptap, so a typo like
// `'centre'` compiles: the button then does nothing while `isActive` keeps
// comparing against `'center'`. Naming the values once, typed, removes the gap
// between the command and the flag it is paired with.
const ALIGN_LEFT: TextAlignment = 'left';
const ALIGN_CENTER: TextAlignment = 'center';
const ALIGN_RIGHT: TextAlignment = 'right';
const ALIGN_JUSTIFY: TextAlignment = 'justify';

const HEADING_1: HeadingLevel = 1;
const HEADING_2: HeadingLevel = 2;
const HEADING_3: HeadingLevel = 3;

export const MARK_ITEMS: ToolbarItem[] = [
  {
    key: 'bold',
    icon: Bold,
    label: TOOLBAR_LABELS.bold,
    run: (editor) => editor.chain().focus().toggleBold().run(),
    isActive: (state) => state.isBold,
    isEnabled: (state) => state.canBold,
  },
  {
    key: 'italic',
    icon: Italic,
    label: TOOLBAR_LABELS.italic,
    run: (editor) => editor.chain().focus().toggleItalic().run(),
    isActive: (state) => state.isItalic,
    isEnabled: (state) => state.canItalic,
  },
  {
    key: 'underline',
    icon: UnderlineIcon,
    label: TOOLBAR_LABELS.underline,
    run: (editor) => editor.chain().focus().toggleUnderline().run(),
    isActive: (state) => state.isUnderline,
    isEnabled: (state) => state.canUnderline,
  },
  {
    key: 'strike',
    icon: Strikethrough,
    label: TOOLBAR_LABELS.strikethrough,
    run: (editor) => editor.chain().focus().toggleStrike().run(),
    isActive: (state) => state.isStrike,
    isEnabled: (state) => state.canStrike,
  },
];

export const HEADING_ITEMS: ToolbarItem[] = [
  {
    key: 'heading1',
    icon: Heading1,
    label: TOOLBAR_LABELS.heading1,
    run: (editor) => editor.chain().focus().toggleHeading({ level: HEADING_1 }).run(),
    isActive: (state) => state.headingLevel === HEADING_1,
  },
  {
    key: 'heading2',
    icon: Heading2,
    label: TOOLBAR_LABELS.heading2,
    run: (editor) => editor.chain().focus().toggleHeading({ level: HEADING_2 }).run(),
    isActive: (state) => state.headingLevel === HEADING_2,
  },
  {
    key: 'heading3',
    icon: Heading3,
    label: TOOLBAR_LABELS.heading3,
    run: (editor) => editor.chain().focus().toggleHeading({ level: HEADING_3 }).run(),
    isActive: (state) => state.headingLevel === HEADING_3,
  },
];

export const ALIGNMENT_ITEMS: ToolbarItem[] = [
  {
    key: 'alignLeft',
    icon: AlignLeft,
    label: TOOLBAR_LABELS.alignLeft,
    run: (editor) => editor.chain().focus().setTextAlign(ALIGN_LEFT).run(),
    isActive: (state) => state.align === ALIGN_LEFT,
  },
  {
    key: 'alignCenter',
    icon: AlignCenter,
    label: TOOLBAR_LABELS.alignCenter,
    run: (editor) => editor.chain().focus().setTextAlign(ALIGN_CENTER).run(),
    isActive: (state) => state.align === ALIGN_CENTER,
  },
  {
    key: 'alignRight',
    icon: AlignRight,
    label: TOOLBAR_LABELS.alignRight,
    run: (editor) => editor.chain().focus().setTextAlign(ALIGN_RIGHT).run(),
    isActive: (state) => state.align === ALIGN_RIGHT,
  },
  {
    key: 'alignJustify',
    icon: AlignJustify,
    label: TOOLBAR_LABELS.alignJustify,
    run: (editor) => editor.chain().focus().setTextAlign(ALIGN_JUSTIFY).run(),
    isActive: (state) => state.align === ALIGN_JUSTIFY,
  },
];

export const BLOCK_ITEMS: ToolbarItem[] = [
  {
    key: 'bulletList',
    icon: List,
    label: TOOLBAR_LABELS.bulletList,
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
    isActive: (state) => state.isBulletList,
  },
  {
    key: 'orderedList',
    icon: ListOrdered,
    label: TOOLBAR_LABELS.orderedList,
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    isActive: (state) => state.isOrderedList,
  },
  {
    key: 'blockquote',
    icon: Quote,
    label: TOOLBAR_LABELS.blockquote,
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
    isActive: (state) => state.isBlockquote,
  },
  {
    key: 'codeBlock',
    icon: Code,
    label: TOOLBAR_LABELS.codeBlock,
    run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    isActive: (state) => state.isCodeBlock,
  },
];

export const HISTORY_ITEMS: ToolbarItem[] = [
  {
    key: 'undo',
    icon: Undo,
    label: TOOLBAR_LABELS.undo,
    run: (editor) => editor.chain().focus().undo().run(),
    isEnabled: (state) => state.canUndo,
  },
  {
    key: 'redo',
    icon: Redo,
    label: TOOLBAR_LABELS.redo,
    run: (editor) => editor.chain().focus().redo().run(),
    isEnabled: (state) => state.canRedo,
  },
];
