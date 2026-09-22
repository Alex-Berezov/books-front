'use client';

import type { FC } from 'react';
import type { ToolbarItem } from './toolbarItems';
import type { ToolbarState } from './useToolbarState';
import type { Editor } from '@tiptap/react';
import styles from './Toolbar.module.scss';
import { ToolbarButton } from './ToolbarButton';

interface ToolbarGroupProps {
  items: ToolbarItem[];
  editor: Editor;
  state: ToolbarState;
  disabled: boolean;
}

/** Renders one described group of buttons - see `toolbarItems.ts`. */
export const ToolbarGroup: FC<ToolbarGroupProps> = (props) => {
  const { items, editor, state, disabled } = props;

  return (
    <div className={styles.group}>
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <ToolbarButton
            key={item.key}
            onClick={() => item.run(editor)}
            isActive={item.isActive?.(state) ?? false}
            disabled={disabled || item.isEnabled?.(state) === false}
            title={item.label}
          >
            <Icon className={styles.icon} />
          </ToolbarButton>
        );
      })}
    </div>
  );
};
