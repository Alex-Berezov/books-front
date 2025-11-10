'use client';

import type { FC } from 'react';
import { useChapters } from '@/api/hooks';
import styles from './ReadContentTab.module.scss';

/**
 * Пропсы компонента ReadContentTab
 */
export interface ReadContentTabProps {
  /** ID версии книги */
  versionId: string;
}

/**
 * Таб для управления текстовым контентом книги
 *
 * Позволяет:
 * - Просматривать список глав
 * - Создавать новые главы
 * - Редактировать существующие главы
 * - Удалять главы
 * - Сортировать главы через drag-and-drop
 */
export const ReadContentTab: FC<ReadContentTabProps> = (props) => {
  const { versionId } = props;

  // Загружаем главы
  const { data: chapters, error, isLoading } = useChapters(versionId);

  /**
   * Обработчик создания новой главы
   */
  const handleAddChapter = () => {
    // TODO (M3.2.3): Реализовать создание главы
    console.log('Add chapter for version:', versionId);
  };

  /**
   * Обработчик редактирования главы
   */
  const handleEditChapter = (chapterId: string) => {
    // TODO (M3.2.3): Реализовать редактирование главы
    console.log('Edit chapter:', chapterId);
  };

  /**
   * Обработчик удаления главы
   */
  const handleDeleteChapter = (chapterId: string) => {
    // TODO (M3.2.3): Реализовать удаление главы
    console.log('Delete chapter:', chapterId);
  };

  // Loading состояние
  if (isLoading) {
    return (
      <div className={styles.container}>
        <p>Loading chapters...</p>
      </div>
    );
  }

  // Error состояние
  if (error) {
    return (
      <div className={styles.container}>
        <p className={styles.errorText}>Failed to load chapters: {error.message}</p>
      </div>
    );
  }

  // Пустое состояние
  if (!chapters || chapters.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Chapters</h2>
          <button className={styles.addButton} onClick={handleAddChapter} type="button">
            + Add Chapter
          </button>
        </div>

        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📖</div>
          <p className={styles.emptyText}>No chapters yet. Start adding content to your book.</p>
          <button className={styles.addButton} onClick={handleAddChapter} type="button">
            Create First Chapter
          </button>
        </div>
      </div>
    );
  }

  // Список глав
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Chapters ({chapters.length})</h2>
        <button className={styles.addButton} onClick={handleAddChapter} type="button">
          + Add Chapter
        </button>
      </div>

      <div className={styles.chaptersList}>
        {chapters.map((chapter) => (
          <div key={chapter.id} className={styles.chapterItem}>
            <div className={styles.chapterInfo}>
              <div className={styles.chapterTitle}>
                {chapter.orderIndex}. {chapter.title || 'Untitled Chapter'}
              </div>
              <div className={styles.chapterMeta}>
                {chapter.isFree ? '🆓 Free' : '🔒 Premium'}
                {chapter.content && ` • ${chapter.content.length} characters`}
              </div>
            </div>

            <div className={styles.chapterActions}>
              <button
                className={styles.actionButton}
                onClick={() => handleEditChapter(chapter.id)}
                type="button"
              >
                ✏️ Edit
              </button>
              <button
                className={styles.actionButton}
                onClick={() => handleDeleteChapter(chapter.id)}
                type="button"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
