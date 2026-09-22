'use client';

import type { FC } from 'react';
import { Link as LinkIcon } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import styles from './Toolbar.module.scss';
import { ToolbarButton } from './ToolbarButton';
import { TOOLBAR_LABELS } from './toolbarLabels';

interface LinkButtonProps {
  editor: Editor;
  disabled?: boolean;
  isActive?: boolean;
}

/** Sets or clears a link; an empty answer removes the one under the caret. */
export const LinkButton: FC<LinkButtonProps> = (props) => {
  const { editor, disabled = false, isActive = false } = props;

  const handleClick = () => {
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    // eslint-disable-next-line no-alert -- the admin-only link prompt predates this file; replacing it with a modal is a separate change, and the rule would otherwise hide behind a moved file.
    const url = window.prompt(TOOLBAR_LABELS.linkPrompt, previousUrl ?? '');

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <ToolbarButton
      onClick={handleClick}
      isActive={isActive}
      disabled={disabled}
      title={TOOLBAR_LABELS.insertLink}
    >
      <LinkIcon className={styles.icon} />
    </ToolbarButton>
  );
};
