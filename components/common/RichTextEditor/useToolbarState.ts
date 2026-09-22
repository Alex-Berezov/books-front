'use client';

import { useEditorState } from '@tiptap/react';
import type { Editor } from '@tiptap/react';

export type TextAlignment = 'left' | 'center' | 'right' | 'justify';
export type HeadingLevel = 1 | 2 | 3;

export interface ToolbarState {
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrike: boolean;
  isBulletList: boolean;
  isOrderedList: boolean;
  isBlockquote: boolean;
  isCodeBlock: boolean;
  isLink: boolean;
  isImage: boolean;
  /** Alignments are mutually exclusive, so one value carries all four buttons. */
  align: TextAlignment | null;
  /** Same for headings: a block is at most one level. */
  headingLevel: HeadingLevel | null;
  canBold: boolean;
  canItalic: boolean;
  canUnderline: boolean;
  canStrike: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

const ALIGNMENTS: TextAlignment[] = ['left', 'center', 'right', 'justify'];
const HEADING_LEVELS: HeadingLevel[] = [1, 2, 3];

/**
 * Subscribes the toolbar to the editor.
 *
 * 🔴 TipTap 3 no longer re-renders on transactions - `shouldRerenderOnTransaction`
 * defaults to `false`. Reading `editor.isActive(...)` in a render body therefore
 * returns whatever was true when the component last happened to render, and the
 * buttons show a stale state: move the caret into bold text and Bold stays dark.
 * `useEditorState` re-renders only when one of the values below actually changes.
 *
 * `editor.can()` is built once per run: each `.can()` call enumerates the whole
 * command table, and going through `.can().chain()` does it twice more. With six
 * checks running on every keystroke that is the difference between one pass and
 * twelve.
 */
export const useToolbarState = (editor: Editor): ToolbarState =>
  useEditorState({
    editor,
    selector: ({ editor: instance }) => {
      const can = instance.can();

      return {
        isBold: instance.isActive('bold'),
        isItalic: instance.isActive('italic'),
        isUnderline: instance.isActive('underline'),
        isStrike: instance.isActive('strike'),
        isBulletList: instance.isActive('bulletList'),
        isOrderedList: instance.isActive('orderedList'),
        isBlockquote: instance.isActive('blockquote'),
        isCodeBlock: instance.isActive('codeBlock'),
        isLink: instance.isActive('link'),
        isImage: instance.isActive('image'),
        align: ALIGNMENTS.find((value) => instance.isActive({ textAlign: value })) ?? null,
        headingLevel:
          HEADING_LEVELS.find((level) => instance.isActive('heading', { level })) ?? null,
        canBold: can.toggleBold(),
        canItalic: can.toggleItalic(),
        canUnderline: can.toggleUnderline(),
        canStrike: can.toggleStrike(),
        canUndo: can.undo(),
        canRedo: can.redo(),
      };
    },
  });
