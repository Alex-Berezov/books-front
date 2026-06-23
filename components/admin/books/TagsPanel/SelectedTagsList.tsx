import type { FC } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/common/Button';
import type { Tag } from '@/types/api-schema';
import styles from './TagsPanel.module.scss';

interface SelectedTagsListProps {
  tags: Tag[];
  isPending: boolean;
  onRemoveTag: (tagId: string) => void;
}

export const SelectedTagsList: FC<SelectedTagsListProps> = (props) => {
  const { tags, isPending, onRemoveTag } = props;
  const params = useParams();
  const lang = params?.lang as string;

  const getTagName = (tag: Tag) => {
    if (tag.translations && lang) {
      const translation = tag.translations.find((t) => t.language === lang);
      if (translation) {
        return translation.name;
      }
    }
    return tag.name;
  };

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className={styles.selectedSection}>
      <h4 className={styles.selectedTitle}>Selected Tags:</h4>
      <div className={styles.selectedList}>
        {tags.map((tag) => (
          <div className={styles.selectedTag} key={tag.id}>
            <span>{getTagName(tag)}</span>
            <Button
              variant="ghost"
              size="sm"
              className={styles.removeButton}
              disabled={isPending}
              onClick={() => onRemoveTag(tag.id)}
              ariaLabel={`Remove ${getTagName(tag)}`}
            >
              ×
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
