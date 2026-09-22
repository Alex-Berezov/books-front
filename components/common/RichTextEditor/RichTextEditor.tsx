'use client';

import { useEffect, useState, type CSSProperties, type FC } from 'react';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { RichTextEditorProps, RichTextImage } from './RichTextEditor.types';
import styles from './RichTextEditor.module.scss';
import { Toolbar } from './Toolbar';

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
    imagePicker,
    enableAlignment = true,
  } = props;

  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const editor = useEditor({
    // Avoid SSR hydration mismatches in Next.js.
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      // StarterKit 3 already ships Link and Underline. Leaving them on while
      // also listing the configured copies below makes TipTap warn about
      // duplicate extension names, and which copy wins is not defined -
      // the link options right underneath were never guaranteed to apply.
      StarterKit.configure({ link: false, underline: false }),
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
      // 🔴 The extension is registered only when alignment is on, not merely
      // hidden from the toolbar. It ships `Mod-Shift-L/E/R/J` shortcuts of its
      // own, so leaving it loaded would let Ctrl+Shift+E store
      // `<p style="text-align: center">` in a field whose consumer prints the
      // value as plain text - and the reader would see that attribute.
      ...(enableAlignment
        ? [
            TextAlign.configure({
              // Lists and quotes keep their own layout; aligning blocks of text
              // is what editors are expected to do.
              types: ['heading', 'paragraph'],
            }),
          ]
        : []),
      // Same reasoning as above: without a picker the field is not meant to
      // hold images at all, and a registered extension would still accept one
      // pasted as HTML from another page.
      ...(imagePicker
        ? [
            Image.configure({
              // Inline images sit inside a paragraph, so the paragraph's inline
              // `text-align` centres them for free - no extra CSS, and the
              // editor matches the published page.
              inline: true,
              // Pasting a screenshot from the clipboard would otherwise inline
              // megabytes of base64 into a column that has no length limit
              // (Postgres TEXT, DTOs carry no @MaxLength). Images go through
              // the picker instead.
              allowBase64: false,
            }),
          ]
        : []),
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

  const Picker = imagePicker;

  const handleImageSelected = (image: RichTextImage) => {
    setIsPickerOpen(false);
    editor?.chain().focus().setImage({ src: image.url, alt: image.alt }).run();
  };

  return (
    <div className={wrapperClasses}>
      {editor && (
        <Toolbar
          editor={editor}
          disabled={disabled}
          onInsertImage={Picker ? () => setIsPickerOpen(true) : undefined}
          enableAlignment={enableAlignment}
        />
      )}
      <EditorContent editor={editor} className={styles.editor} style={editorStyle} />

      {/* Outside the toolbar on purpose - see `ImageButton`: the sticky toolbar
          is a stacking context, and a fixed dialog inside it would be drawn
          beneath the admin sidebar. */}
      {Picker && isPickerOpen && (
        <Picker
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onSelect={handleImageSelected}
        />
      )}
    </div>
  );
};
