'use client';

import { useState, type FC } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import type { RichTextImage, RichTextImagePicker } from './RichTextEditor.types';
import type { Editor } from '@tiptap/react';
import styles from './Toolbar.module.scss';
import { ToolbarButton } from './ToolbarButton';
import { TOOLBAR_LABELS } from './toolbarLabels';

interface ImageButtonProps {
  editor: Editor;
  picker: RichTextImagePicker;
  disabled?: boolean;
  isActive?: boolean;
}

/**
 * Inserts an image into the editor through a picker supplied by the caller.
 *
 * The picker is a prop rather than an import so the design system stays free of
 * the admin area: the media library lives in `components/admin/`, and pulling it
 * in here would make every page that renders the editor depend on admin code.
 */
export const ImageButton: FC<ImageButtonProps> = (props) => {
  const { editor, picker: Picker, disabled = false, isActive = false } = props;

  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleSelect = (image: RichTextImage) => {
    setIsPickerOpen(false);
    editor.chain().focus().setImage({ src: image.url, alt: image.alt }).run();
  };

  return (
    <>
      <ToolbarButton
        onClick={() => setIsPickerOpen(true)}
        isActive={isActive}
        disabled={disabled}
        title={TOOLBAR_LABELS.insertImage}
      >
        <ImageIcon className={styles.icon} />
      </ToolbarButton>

      {isPickerOpen && (
        <Picker
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onSelect={handleSelect}
        />
      )}
    </>
  );
};
