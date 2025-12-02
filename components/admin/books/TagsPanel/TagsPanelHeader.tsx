import type { FC } from 'react';
import { Tag as TagIcon } from 'lucide-react';
import styles from './TagsPanel.module.scss';

interface TagsPanelHeaderProps {
  selectedCount: number;
}

export const TagsPanelHeader: FC<TagsPanelHeaderProps> = (props) => {
  const { selectedCount } = props;

  return (
    <div className={styles.header}>
      <div className={styles.titleGroup}>
        <TagIcon className={styles.icon} size={20} />
        <h3 className={styles.title}>Tags</h3>
      </div>
      {selectedCount > 0 && <span className={styles.counter}>{selectedCount} selected</span>}
    </div>
  );
};
