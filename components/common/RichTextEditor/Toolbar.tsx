'use client';

import type { FC } from 'react';
import type { Editor } from '@tiptap/react';
import { ImageButton } from './ImageButton';
import { LinkButton } from './LinkButton';
import styles from './Toolbar.module.scss';
import { ToolbarGroup } from './ToolbarGroup';
import {
  ALIGNMENT_ITEMS,
  BLOCK_ITEMS,
  HEADING_ITEMS,
  HISTORY_ITEMS,
  MARK_ITEMS,
} from './toolbarItems';
import { TOOLBAR_LABELS } from './toolbarLabels';
import { useToolbarState } from './useToolbarState';

interface ToolbarProps {
  editor: Editor;
  disabled?: boolean;
  /** Absent means the field takes no images and the button is not rendered. */
  onInsertImage?: () => void;
  enableAlignment?: boolean;
}

const Divider: FC = () => <div className={styles.divider} aria-hidden="true" />;

export const Toolbar: FC<ToolbarProps> = (props) => {
  const { editor, disabled = false, onInsertImage, enableAlignment = true } = props;

  const state = useToolbarState(editor);

  const groupProps = { editor, state, disabled };

  return (
    <div className={styles.toolbar} role="toolbar" aria-label={TOOLBAR_LABELS.toolbar}>
      <ToolbarGroup items={MARK_ITEMS} {...groupProps} />

      <Divider />
      <ToolbarGroup items={HEADING_ITEMS} {...groupProps} />

      {enableAlignment && (
        <>
          <Divider />
          <ToolbarGroup items={ALIGNMENT_ITEMS} {...groupProps} />
        </>
      )}

      <Divider />
      <ToolbarGroup items={BLOCK_ITEMS} {...groupProps} />

      <Divider />
      <div className={styles.group}>
        <LinkButton editor={editor} disabled={disabled} isActive={state.isLink} />
        {onInsertImage && (
          <ImageButton onClick={onInsertImage} disabled={disabled} isActive={state.isImage} />
        )}
      </div>

      <Divider />
      <ToolbarGroup items={HISTORY_ITEMS} {...groupProps} />
    </div>
  );
};
