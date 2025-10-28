'use client';

import { useState } from 'react';
import type { FC } from 'react';
import { useRouter } from 'next/navigation';
import { useBookVersion, useUpdateBookVersion } from '@/api/hooks/useAdmin';
import {
  BookForm,
  BookVersionTabs,
  ListenContentTab,
  ReadContentTab,
  SummaryTab,
  type BookFormData,
  type TabType,
} from '@/components/admin/books';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { UpdateBookVersionRequest } from '@/types/api-schema';
import styles from './page.module.scss';

interface EditBookVersionPageProps {
  params: {
    lang: SupportedLang;
    id: string;
  };
}

/**
 * Страница редактирования версии книги
 *
 * Загружает существующую версию и позволяет редактировать её данные
 */
const EditBookVersionPage: FC<EditBookVersionPageProps> = (props) => {
  const { params } = props;
  const { lang, id: versionId } = params;

  const router = useRouter();

  // Состояние активного таба
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Загружаем данные версии
  const { data: version, error, isLoading } = useBookVersion(versionId);

  // Мутация для обновления версии
  const updateMutation = useUpdateBookVersion({
    onSuccess: () => {
      // TODO: Показать toast уведомление об успехе
      console.log('Book version updated successfully');
    },
    onError: (error) => {
      // TODO: Показать toast уведомление об ошибке
      console.error('Failed to update book version:', error);
    },
  });

  /**
   * Обработчик отправки формы
   */
  const handleSubmit = async (formData: BookFormData) => {
    // Преобразуем данные формы в формат API
    const requestData: UpdateBookVersionRequest = {
      title: formData.title,
      author: formData.author,
      description: formData.description || undefined,
      coverImageUrl: formData.coverImageUrl || undefined,
      type: formData.type,
      isFree: formData.isFree,
      referralUrl: formData.referralUrl || undefined,
      seoMetaTitle: formData.seoMetaTitle || undefined,
      seoMetaDescription: formData.seoMetaDescription || undefined,
    };

    // Отправляем запрос на обновление
    updateMutation.mutate({
      versionId,
      data: requestData,
    });
  };

  // Loading состояние
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <p>Loading...</p>
      </div>
    );
  }

  // Error состояние
  if (error || !version) {
    return (
      <div className={styles.errorContainer}>
        <h1 className={styles.errorTitle}>Error</h1>
        <p className={styles.errorMessage}>
          Failed to load book version. {error?.message || 'Version not found.'}
        </p>
        <button
          className={styles.errorButton}
          onClick={() => router.push(`/admin/${lang}/books`)}
          type="button"
        >
          Back to Books List
        </button>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => router.push(`/admin/${lang}/books`)}
          type="button"
        >
          ← Back to Books List
        </button>
        <h1 className={styles.pageTitle}>Edit Book Version</h1>
        <p className={styles.versionMeta}>
          {version.title} • {version.language.toUpperCase()} • {version.status}
        </p>
      </div>

      <BookVersionTabs
        activeTab={activeTab}
        listenContent={<ListenContentTab versionId={versionId} />}
        onTabChange={setActiveTab}
        overviewContent={
          <BookForm
            initialData={version}
            isSubmitting={updateMutation.isPending}
            lang={lang}
            onSubmit={handleSubmit}
          />
        }
        readContent={<ReadContentTab versionId={versionId} />}
        summaryContent={<SummaryTab versionId={versionId} />}
      />
    </div>
  );
};

export default EditBookVersionPage;
