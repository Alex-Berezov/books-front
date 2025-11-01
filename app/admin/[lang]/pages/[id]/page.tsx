'use client';

import type { FC } from 'react';
import { useRouter } from 'next/navigation';
import { usePage, useUpdatePage } from '@/api/hooks/useAdmin';
import { PageForm, type PageFormData } from '@/components/admin/pages/PageForm';
import { PagePublishPanel } from '@/components/admin/pages/PagePublishPanel';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './page.module.scss';

interface EditPageProps {
  params: {
    lang: SupportedLang;
    id: string;
  };
}

/**
 * Страница редактирования CMS страницы
 *
 * Загружает существующую страницу и позволяет редактировать её данные
 */
const EditPage: FC<EditPageProps> = (props) => {
  const { params } = props;
  const { lang, id: pageId } = params;

  const router = useRouter();

  // Загружаем данные страницы
  const { data: page, error, isLoading } = usePage(pageId, lang);

  // Мутация для обновления страницы
  const updateMutation = useUpdatePage({
    onSuccess: () => {
      // TODO: Показать toast уведомление об успехе
      console.log('Page updated successfully');
    },
    onError: (error) => {
      // TODO: Показать toast уведомление об ошибке
      console.error('Failed to update page:', error);
      alert(`Failed to update page: ${error.message}`);
    },
  });

  /**
   * Обработчик успешной публикации
   */
  const handlePublishSuccess = () => {
    // TODO: Показать toast уведомление
    console.log('Page published successfully');
  };

  /**
   * Обработчик успешного снятия с публикации
   */
  const handleUnpublishSuccess = () => {
    // TODO: Показать toast уведомление
    console.log('Page unpublished successfully');
  };

  /**
   * Обработчик отправки формы
   */
  const handleSubmit = async (formData: PageFormData) => {
    updateMutation.mutate({
      pageId,
      lang,
      data: {
        title: formData.title,
        slug: formData.slug,
        content: formData.content,
        seo: {
          title: formData.seoTitle || undefined,
          description: formData.seoDescription || undefined,
        },
      },
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading page...</div>
      </div>
    );
  }

  // Error state
  if (error || !page) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>Failed to load page</p>
          {error && <p className={styles.errorMessage}>{error.message}</p>}
          <button
            className={styles.backButton}
            onClick={() => router.push(`/admin/${lang}/pages`)}
            type="button"
          >
            ← Back to Pages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Edit Page: {page.title}</h1>
        <button
          className={styles.backButton}
          onClick={() => router.push(`/admin/${lang}/pages`)}
          type="button"
        >
          ← Back to Pages
        </button>
      </div>

      <div className={styles.layout}>
        {/* Main content */}
        <div className={styles.mainContent}>
          <PageForm
            lang={lang}
            initialData={page}
            onSubmit={handleSubmit}
            isSubmitting={updateMutation.isPending}
          />
        </div>

        {/* Sidebar */}
        <div className={styles.sidebar}>
          <PagePublishPanel
            lang={lang}
            page={page}
            onPublishSuccess={handlePublishSuccess}
            onUnpublishSuccess={handleUnpublishSuccess}
          />
        </div>
      </div>
    </div>
  );
};

export default EditPage;
