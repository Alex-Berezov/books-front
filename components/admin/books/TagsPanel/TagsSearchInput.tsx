import type { FC } from 'react';
import styles from './TagsPanel.module.scss';

interface TagsSearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const TagsSearchInput: FC<TagsSearchInputProps> = (props) => {
  const { value, onChange } = props;

  return (
    <div className={styles.searchContainer}>
      <input
        className={styles.searchInput}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search tags..."
        type="text"
        value={value}
      />
    </div>
  );
};
