'use client';

import type { FC } from 'react';
import { MediaLibraryImagePicker } from '@/components/admin/media/MediaLibraryImagePicker';
import { RichTextEditor } from '@/components/common/RichTextEditor';
import type { RichTextEditorProps } from '@/components/common/RichTextEditor';

export type AdminRichTextEditorProps = Omit<RichTextEditorProps, 'imagePicker'>;

/**
 * The rich text editor as the admin area uses it: with the media library wired
 * to the image button.
 *
 * Admin forms take this rather than `RichTextEditor` directly so the knowledge
 * that images come from the media library lives in exactly one file, and the
 * design system keeps knowing nothing about the admin area.
 *
 * The picker is imported statically on purpose. `next/dynamic` here bought
 * nothing: every route that renders this component already pulls
 * `MediaSelectModal` through `MediaPicker` (cover fields, OG image), and the
 * one route that did not - the comments page - does not use this wrapper at
 * all, because a reply is shown to readers as plain text.
 */
export const AdminRichTextEditor: FC<AdminRichTextEditorProps> = (props) => (
  <RichTextEditor {...props} imagePicker={MediaLibraryImagePicker} />
);
