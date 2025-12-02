import type { FC } from 'react';
import type { Chapter } from '@/types/api-schema';
import styles from './ReadContentTab.module.scss';

interface ReadContentListProps {
  chapters: Chapter[];
  onEditChapter: (id: string) => void;
  onDeleteChapter: (id: string) => void;
}

export const ReadContentList: FC<ReadContentListProps> = (props) => {
  const { chapters, onEditChapter, onDeleteChapter } = props;

  return (
    <div className={styles.chaptersList}>
      {chapters.map((chapter) => {
        const chapterTitle = chapter.title || 'Untitled Chapter';
        const accessBadge = chapter.isFree ? '🆓 Free' : '🔒 Premium';
        const charCount = chapter.content ? `${chapter.content.length} characters` : null;

        return (
          <div key={chapter.id} className={styles.chapterItem}>
            <div className={styles.chapterInfo}>
              <div className={styles.chapterTitle}>
                {chapter.orderIndex}. {chapterTitle}
              </div>
              <div className={styles.chapterMeta}>
                {accessBadge}
                {charCount && ` • ${charCount}`}
              </div>
            </div>

            <div className={styles.chapterActions}>
              <button
                className={styles.actionButton}
                onClick={() => onEditChapter(chapter.id)}
                type="button"
              >
                ✏️ Edit
              </button>
              <button
                className={styles.actionButton}
                onClick={() => onDeleteChapter(chapter.id)}
                type="button"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
