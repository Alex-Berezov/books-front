'use client';

import type { FC } from 'react';
import { useChapters } from '@/api/hooks/useAdmin';
import styles from './ReadContentTab.module.scss'; // Используем те же стили

/**
 * Пропсы компонента ListenContentTab
 */
export interface ListenContentTabProps {
  /** ID версии книги */
  versionId: string;
}

/**
 * Таб для управления аудио контентом книги
 *
 * Позволяет:
 * - Просматривать список аудио глав
 * - Загружать аудио файлы
 * - Управлять аудио главами
 * - Добавлять транскрипты для каждой главы
 */
export const ListenContentTab: FC<ListenContentTabProps> = (props) => {
  const { versionId } = props;

  // Загружаем главы (аудио)
  const { data: chapters, error, isLoading } = useChapters(versionId);

  /**
   * Обработчик загрузки аудио файла
   */
  const handleUploadAudio = () => {
    // TODO (M3.2.3): Реализовать загрузку аудио
    console.log('Upload audio for version:', versionId);
  };

  /**
   * Обработчик создания аудио главы
   */
  const handleAddAudioChapter = () => {
    // TODO (M3.2.3): Реализовать создание аудио главы
    console.log('Add audio chapter for version:', versionId);
  };

  /**
   * Обработчик редактирования аудио главы
   */
  const handleEditAudioChapter = (chapterId: string) => {
    // TODO (M3.2.3): Реализовать редактирование аудио главы
    console.log('Edit audio chapter:', chapterId);
  };

  // Loading состояние
  if (isLoading) {
    return (
      <div className={styles.container}>
        <p>Loading audio chapters...</p>
      </div>
    );
  }

  // Error состояние
  if (error) {
    return (
      <div className={styles.container}>
        <p className={styles.errorText}>Failed to load audio chapters: {error.message}</p>
      </div>
    );
  }

  // Фильтруем только аудио главы
  const audioChapters = chapters?.filter((ch) => ch.audioUrl) || [];

  // Пустое состояние
  if (audioChapters.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Audio Chapters</h2>
          <button className={styles.addButton} onClick={handleAddAudioChapter} type="button">
            + Add Audio Chapter
          </button>
        </div>

        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎧</div>
          <p className={styles.emptyText}>No audio chapters yet. Start by uploading audio files.</p>
          <button className={styles.addButton} onClick={handleUploadAudio} type="button">
            Upload Audio
          </button>
        </div>
      </div>
    );
  }

  // Список аудио глав
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Audio Chapters ({audioChapters.length})</h2>
        <button className={styles.addButton} onClick={handleAddAudioChapter} type="button">
          + Add Audio Chapter
        </button>
      </div>

      <div className={styles.chaptersList}>
        {audioChapters.map((chapter) => (
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
                onClick={() => handleEditAudioChapter(chapter.id)}
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
    </div>
  );
};
