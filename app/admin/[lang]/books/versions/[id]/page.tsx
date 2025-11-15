'use client';

import { useState } from 'react';
import type { FC } from 'react';
import { useRouter } from 'next/navigation';
import { useBookVersion, useUpdateBookVersion } from '@/api/hooks';
import {
  BookForm,
  BookVersionTabs,
  CategoriesPanel,
  ListenContentTab,
  PublishPanel,
  ReadContentTab,
  SummaryTab,
  TagsPanel,
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
 * Book version edit page
 *
 * Loads existing version and allows editing its data
 */
const EditBookVersionPage: FC<EditBookVersionPageProps> = (props) => {
  const { params } = props;
  const { lang, id: versionId } = params;

  const router = useRouter();

  // Active tab state
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Load version data
  const { data: version, error, isLoading } = useBookVersion(versionId);

  // Mutation for updating version
  const updateMutation = useUpdateBookVersion({
    onSuccess: () => {
      // TODO: Show success toast notification
      console.log('Book version updated successfully');
    },
    onError: (error) => {
      // TODO: Show error toast notification
      console.error('Failed to update book version:', error);
    },
  });

  /**
   * Successful publish handler
   */
  const handlePublishSuccess = () => {
    // TODO: Show toast notification
    console.log('Version published successfully');
  };

  /**
   * Successful unpublish handler
   */
  const handleUnpublishSuccess = () => {
    // TODO: Show toast notification
    console.log('Version unpublished successfully');
  };

  /**
   * Categories change handler
   */
  const handleCategoriesChange = () => {
    // TODO: Show toast notification
    console.log('Categories updated');
  };

  /**
   * Tags change handler
   */
  const handleTagsChange = () => {
    // TODO: Show toast notification
    console.log('Tags updated');
  };

  /**
   * Form submission handler
   */
  const handleSubmit = async (formData: BookFormData) => {
    // Convert form data to API format
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

    // Send update request
    updateMutation.mutate({
      versionId,
      data: requestData,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <p>Loading...</p>
      </div>
    );
  }

  // Error state
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
        <div className={styles.headerActions}>
          <button
            className={styles.backButton}
            onClick={() => router.push(`/admin/${lang}/books`)}
            type="button"
          >
            ← Back to Books List
          </button>
          <button
            className={styles.addVersionButton}
            onClick={() =>
              router.push(
                `/admin/${lang}/books/new?bookId=${version.bookId}&title=${encodeURIComponent(version.title)}&author=${encodeURIComponent(version.author)}`
              )
            }
            type="button"
          >
            + Add Another Version
          </button>
        </div>
        <h1 className={styles.pageTitle}>Edit Book Version</h1>
        <p className={styles.versionMeta}>
          {version.title} • {version.language.toUpperCase()} • {version.status}
        </p>
        <p className={styles.slugMeta}>
          Book Slug: <code className={styles.slugCode}>{version.bookSlug}</code>
        </p>
      </div>

      <div className={styles.contentLayout}>
        <div className={styles.mainContent}>
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

        <aside className={styles.sidebar}>
          <PublishPanel
            onPublishSuccess={handlePublishSuccess}
            onUnpublishSuccess={handleUnpublishSuccess}
            status={version.status}
            versionId={versionId}
          />

          <div className={styles.sidebarSpacer} />

          <CategoriesPanel
            onCategoriesChange={handleCategoriesChange}
            selectedCategories={version.categories || []}
            versionId={versionId}
          />

          <div className={styles.sidebarSpacer} />

          <TagsPanel
            onTagsChange={handleTagsChange}
            selectedTags={version.tags || []}
            versionId={versionId}
          />
        </aside>
      </div>
    </div>
  );
};

export default EditBookVersionPage;
