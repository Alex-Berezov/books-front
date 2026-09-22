import type { ComponentType } from 'react';

/** An image chosen for insertion into the editor. */
export interface RichTextImage {
  /** Absolute or root-relative URL of the image. */
  url: string;
  /** Alt text; empty tells a screen reader nothing, so callers should fill it. */
  alt: string;
}

export interface RichTextImagePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (image: RichTextImage) => void;
}

/**
 * Supplies the "insert image" flow from outside the design system.
 *
 * The editor lives in `components/common/` and must not know where images come
 * from: the media library is an admin domain module, and a `common/` component
 * importing it would make the design system depend on the admin area. Callers
 * that have a picker pass it in; callers that do not simply get no image
 * button.
 */
export type RichTextImagePicker = ComponentType<RichTextImagePickerProps>;

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
  /**
   * Picker backing the "insert image" button. Omit it and the button is not
   * rendered - the right call wherever the stored HTML is later shown as plain
   * text rather than markup.
   */
  imagePicker?: RichTextImagePicker;
  /**
   * Whether the alignment buttons are shown. Off for fields whose consumer
   * renders the value as plain text, where alignment would only ever reach the
   * reader as a visible `style="text-align: …"` string.
   */
  enableAlignment?: boolean;
}
