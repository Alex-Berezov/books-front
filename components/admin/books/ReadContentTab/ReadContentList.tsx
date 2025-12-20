import type { FC } from 'react';
import { Button } from '@/components/common/Button';
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
        const charCount = chapter.content ? `${chapter.content.length} characters` : null;

        return (
          <div key={chapter.id} className={styles.chapterItem}>
            <div className={styles.chapterInfo}>
              <div className={styles.chapterTitle}>
                {chapter.number}. {chapterTitle}
              </div>
              <div className={styles.chapterMeta}>{charCount}</div>
            </div>

            <div className={styles.chapterActions}>
              <Button variant="ghost" size="sm" onClick={() => onEditChapter(chapter.id)}>
                ✏️ Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDeleteChapter(chapter.id)}>
                🗑️ Delete
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
