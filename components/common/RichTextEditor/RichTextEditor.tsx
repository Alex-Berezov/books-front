'use client';

import { useEffect, type CSSProperties, type FC } from 'react';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import styles from './RichTextEditor.module.scss';
import { Toolbar } from './Toolbar';

export interface RichTextEditorProps {
  /** Current HTML value */
  value: string;
  /** Called whenever the editor content changes (returns HTML) */
  onChange: (html: string) => void;
  /** Called when the editor loses focus */
  onBlur?: () => void;
  /** Placeholder shown when the editor is empty */
  placeholder?: string;
  /** Disables editing */
  disabled?: boolean;
  /** Visual error state */
  error?: boolean;
  /** DOM id applied to the editable content area */
  id?: string;
  /** Minimum height of the editor content area (CSS value) */
  minHeight?: string;
  /** Accessible label */
  ariaLabel?: string;
}

/**
 * RichTextEditor - Headless rich text editor built on TipTap/ProseMirror.
 *
 * Stores and emits HTML strings. Compatible with react-hook-form via `Controller`:
 *
 * @example
 * ```tsx
 * <Controller
 *   name="description"
 *   control={control}
 *   render={({ field }) => (
 *     <RichTextEditor
 *       value={field.value ?? ''}
 *       onChange={field.onChange}
 *       onBlur={field.onBlur}
 *       placeholder="Enter description"
 *     />
 *   )}
 * />
 * ```
 */
export const RichTextEditor: FC<RichTextEditorProps> = (props) => {
  const {
    value,
    onChange,
    onBlur,
    placeholder,
    disabled = false,
    error = false,
    id,
    minHeight = '160px',
    ariaLabel,
  } = props;

  const editor = useEditor({
    // Avoid SSR hydration mismatches in Next.js.
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? '',
      }),
    ],
    content: value || '',
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML();
      // TipTap renders an empty document as "<p></p>"; normalize to empty string
      // so RHF validation for required fields works as expected.
      const isEmpty = instance.isEmpty;
      onChange(isEmpty ? '' : html);
    },
    onBlur: () => {
      onBlur?.();
    },
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
        role: 'textbox',
        'aria-multiline': 'true',
      },
    },
  });

  // Keep editor content in sync with external value changes (e.g. form reset).
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || '';
    // Only update when the external value actually differs to avoid cursor jumps.
    if (next !== current && !(editor.isEmpty && next === '')) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [value, editor]);

  // Keep editable state in sync with disabled prop.
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  const wrapperClasses = [
    styles.wrapper,
    error ? styles.wrapperError : '',
    disabled ? styles.wrapperDisabled : '',
  ]
    .filter(Boolean)
    .join(' ');

  const editorStyle: CSSProperties = { minHeight };

  return (
    <div className={wrapperClasses}>
      {editor && <Toolbar editor={editor} disabled={disabled} />}
      <EditorContent editor={editor} className={styles.editor} style={editorStyle} />
    </div>
  );
};
