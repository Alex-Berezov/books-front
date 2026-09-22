'use client';

import type { FC } from 'react';
import type { RichTextImagePickerProps } from '@/components/common/RichTextEditor';
import { MediaSelectModal } from './MediaSelectModal';

/**
 * Adapts the media library to the editor's image-picker contract.
 *
 * This is the seam that keeps `components/common/` free of admin code: the
 * editor asks for "something that can hand me an image", and only the admin
 * area knows that the something is the media library. It gives the editor both
 * upload-from-disk and pick-from-library for free, and keeps every image on our
 * own storage - a URL typed by hand would point at a third-party host and die
 * with it.
 */
export const MediaLibraryImagePicker: FC<RichTextImagePickerProps> = (props) => {
  const { isOpen, onClose, onSelect } = props;

  return (
    <MediaSelectModal
      isOpen={isOpen}
      onClose={onClose}
      allowedTypes={['image']}
      onSelect={(file) =>
        // `filename` is weak alt text, but an empty one tells a screen reader
        // nothing at all and trips the a11y lint on the public side.
        onSelect({ url: file.url, alt: file.filename })
      }
    />
  );
};
