'use client';

import type { FC } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import styles from './Toolbar.module.scss';
import { ToolbarButton } from './ToolbarButton';
import { TOOLBAR_LABELS } from './toolbarLabels';

interface ImageButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
}

/**
 * Opens the image picker.
 *
 * 🔴 The picker itself is rendered by `RichTextEditor`, not here. The toolbar is
 * `position: sticky`, and a sticky element creates a stacking context of its
 * own - a `position: fixed` dialog rendered inside it stops being measured
 * against the document and ends up beneath the admin sidebar
 * (`AdminSidebar.module.scss`, `fixed`, `z-index: 100`). `Modal` has no portal,
 * so the only way out is to keep the dialog out of this subtree.
 */
export const ImageButton: FC<ImageButtonProps> = (props) => {
  const { onClick, disabled = false, isActive = false } = props;

  return (
    <ToolbarButton
      onClick={onClick}
      isActive={isActive}
      disabled={disabled}
      title={TOOLBAR_LABELS.insertImage}
    >
      <ImageIcon className={styles.icon} />
    </ToolbarButton>
  );
};
