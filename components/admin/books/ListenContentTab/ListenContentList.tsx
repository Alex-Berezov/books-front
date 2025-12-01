import type { FC } from 'react';
import type { Chapter } from '@/types/api-schema';
import styles from '../ReadContentTab/ReadContentTab.module.scss';

interface ListenContentListProps {
  chapters: Chapter[];
  onEditChapter: (id: string) => void;
}

export const ListenContentList: FC<ListenContentListProps> = ({ chapters, onEditChapter }) => {
  return (
    <div className={styles.chaptersList}>
      {chapters.map((chapter) => (
        <div key={chapter.id} className={styles.chapterItem}>
          <div className={styles.chapterInfo}>
            <div className={styles.chapterTitle}>
              {chapter.orderIndex}. {chapter.title || 'Untitled Audio Chapter'}
            </div>
            <div className={styles.chapterMeta}>
              {chapter.isFree ? '🆓 Free' : '🔒 Premium'}
              {chapter.duration && ` • ${Math.floor(chapter.duration / 60)} min`}
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
            <button className={styles.actionButton} type="button">
              🎵 Play
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
