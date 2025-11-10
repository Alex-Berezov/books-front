'use client';

import type { FC } from 'react';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { usePage, useUpdatePage } from '@/api/hooks';
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
  const { enqueueSnackbar } = useSnackbar();

  // Загружаем данные страницы (БЕЗ lang - как у versions)
  const { data: page, error, isLoading } = usePage(pageId);

  // Мутация для обновления страницы
  const updateMutation = useUpdatePage({
    onSuccess: () => {
      enqueueSnackbar('Page updated successfully', { variant: 'success' });
      console.log('Page updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update page:', error);
      enqueueSnackbar(`Failed to update page: ${error.message}`, { variant: 'error' });
    },
  });

  /**
   * Обработчик успешной публикации
   */
  const handlePublishSuccess = () => {
    enqueueSnackbar('Page published successfully', { variant: 'success' });
    console.log('Page published successfully');
  };

  /**
   * Обработчик успешного снятия с публикации
   */
  const handleUnpublishSuccess = () => {
    enqueueSnackbar('Page unpublished successfully', { variant: 'success' });
    console.log('Page unpublished successfully');
  };

  /**
   * Обработчик отправки формы
   */
  const handleSubmit = async (formData: PageFormData) => {
    // ✅ Backend теперь поддерживает вложенный seo объект!
    // См. docs/PAGES_SEO_UPDATE_GUIDE.md для деталей

    // Формируем полный SEO объект со всеми полями (только заполненные)
    const seo = {
      // Basic Meta Tags
      metaTitle: formData.seoMetaTitle || undefined,
      metaDescription: formData.seoMetaDescription || undefined,
      // Technical SEO
      canonicalUrl: formData.seoCanonicalUrl || undefined,
      robots: formData.seoRobots || undefined,
      // Open Graph
      ogTitle: formData.seoOgTitle || undefined,
      ogDescription: formData.seoOgDescription || undefined,
      ogImageUrl: formData.seoOgImageUrl || undefined,
      // Twitter Card
      twitterCard: formData.seoTwitterCard || undefined,
      // ⚠️ Backend не поддерживает twitterTitle и twitterDescription
      // Вместо этого используются metaTitle и metaDescription для Twitter Card
    };

    // Проверяем, есть ли хотя бы одно заполненное SEO поле
    const hasSeoData = Object.values(seo).some((val) => val !== undefined);

    updateMutation.mutate({
      pageId,
      lang,
      data: {
        title: formData.title,
        slug: formData.slug,
        type: formData.type,
        content: formData.content,
        seo: hasSeoData ? seo : undefined, // ✅ Backend автоматически создаст/обновит SEO entity
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
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>Failed to load page</p>
          <p className={styles.errorMessage}>{error.message}</p>
          <div className={styles.errorActions}>
            <button
              className={styles.backButton}
              onClick={() => router.push(`/admin/${lang}/pages`)}
              type="button"
            >
              ← Back to Pages List
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!page) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>Page not found</p>
          <button
            className={styles.backButton}
            onClick={() => router.push(`/admin/${lang}/pages`)}
            type="button"
          >
            ← Back to Pages List
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
