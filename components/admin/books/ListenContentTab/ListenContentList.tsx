import type { FC } from 'react';
import { Button } from '@/components/common/Button';
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
              {chapter.number}. {chapter.title || 'Untitled Audio Chapter'}
            </div>
            <div className={styles.chapterMeta}>
              {/* TODO: Add isFree to Chapter type if needed */}
              {chapter.duration && ` • ${Math.floor(chapter.duration / 60)} min`}
            </div>
          </div>

          <div className={styles.chapterActions}>
            <Button variant="ghost" size="sm" onClick={() => onEditChapter(chapter.id)}>
              ✏️ Edit
            </Button>
            <Button variant="ghost" size="sm">
              🎵 Play
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
