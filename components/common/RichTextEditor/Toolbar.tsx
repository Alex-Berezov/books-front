'use client';

import type { FC } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Undo,
  Redo,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';
import styles from './Toolbar.module.scss';

interface ToolbarProps {
  editor: Editor;
  disabled?: boolean;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

const ToolbarButton: FC<ToolbarButtonProps> = (props) => {
  const { onClick, isActive = false, disabled = false, title, children } = props;

  const className = isActive ? `${styles.button} ${styles.buttonActive}` : styles.button;

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={isActive}
    >
      {children}
    </button>
  );
};

export const Toolbar: FC<ToolbarProps> = (props) => {
  const { editor, disabled = false } = props;

  const handleSetLink = () => {
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    // eslint-disable-next-line no-alert
    const url = window.prompt('Enter URL', previousUrl ?? '');

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
    <div className={styles.toolbar} role="toolbar" aria-label="Text formatting">
      <div className={styles.group}>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          disabled={disabled || !editor.can().chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className={styles.icon} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          disabled={disabled || !editor.can().chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className={styles.icon} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          disabled={disabled || !editor.can().chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <UnderlineIcon className={styles.icon} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          disabled={disabled || !editor.can().chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough className={styles.icon} />
        </ToolbarButton>
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.group}>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          disabled={disabled}
          title="Heading 1"
        >
          <Heading1 className={styles.icon} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          disabled={disabled}
          title="Heading 2"
        >
          <Heading2 className={styles.icon} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          disabled={disabled}
          title="Heading 3"
        >
          <Heading3 className={styles.icon} />
        </ToolbarButton>
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.group}>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          disabled={disabled}
          title="Bullet list"
        >
          <List className={styles.icon} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          disabled={disabled}
          title="Ordered list"
        >
          <ListOrdered className={styles.icon} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          disabled={disabled}
          title="Blockquote"
        >
          <Quote className={styles.icon} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          disabled={disabled}
          title="Code block"
        >
          <Code className={styles.icon} />
        </ToolbarButton>
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.group}>
        <ToolbarButton
          onClick={handleSetLink}
          isActive={editor.isActive('link')}
          disabled={disabled}
          title="Insert link"
        >
          <LinkIcon className={styles.icon} />
        </ToolbarButton>
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={styles.group}>
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={disabled || !editor.can().chain().focus().undo().run()}
          title="Undo"
        >
          <Undo className={styles.icon} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={disabled || !editor.can().chain().focus().redo().run()}
          title="Redo"
        >
          <Redo className={styles.icon} />
        </ToolbarButton>
      </div>
    </div>
  );
};
