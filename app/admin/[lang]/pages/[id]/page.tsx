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
 * CMS page edit page
 *
 * Loads existing page and allows editing its data
 */
const EditPage: FC<EditPageProps> = (props) => {
  const { params } = props;
  const { lang, id: pageId } = params;

  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  // Load page data (WITHOUT lang - like versions)
  const { data: page, error, isLoading } = usePage(pageId);

  // Mutation for updating page
  const updateMutation = useUpdatePage({
    onSuccess: () => {
      enqueueSnackbar('Page updated successfully', { variant: 'success' });
      console.log('Page updated successfully');
      // Force router refresh to invalidate all caches
      router.refresh();
    },
    onError: (error) => {
      console.error('Failed to update page:', error);
      enqueueSnackbar(`Failed to update page: ${error.message}`, { variant: 'error' });
    },
  });

  /**
   * Successful publish handler
   */
  const handlePublishSuccess = () => {
    enqueueSnackbar('Page published successfully', { variant: 'success' });
    console.log('Page published successfully');
    // Force router refresh to invalidate all caches
    router.refresh();
  };

  /**
   * Successful unpublish handler
   */
  const handleUnpublishSuccess = () => {
    enqueueSnackbar('Page unpublished successfully', { variant: 'success' });
    console.log('Page unpublished successfully');
    // Force router refresh to invalidate all caches
    router.refresh();
  };

  /**
   * Form submission handler
   */
  const handleSubmit = async (formData: PageFormData) => {
    // ✅ Backend now supports nested seo object!
    // See docs/PAGES_SEO_UPDATE_GUIDE.md for details

    // Form complete SEO object with all fields (only filled ones)
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
      // ⚠️ Backend doesn't support twitterTitle and twitterDescription
      // Instead, metaTitle and metaDescription are used for Twitter Card
    };

    // Check if there's at least one filled SEO field
    const hasSeoData = Object.values(seo).some((val) => val !== undefined);

    updateMutation.mutate({
      pageId,
      lang,
      data: {
        title: formData.title,
        slug: formData.slug,
        type: formData.type,
        content: formData.content,
        seo: hasSeoData ? seo : undefined, // ✅ Backend will automatically create/update SEO entity
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
