'use client';

import type { FC } from 'react';
import { ArrowLeft, Eye, Plus, Save } from 'lucide-react';
import {
  BookForm,
  BookVersionTabs,
  CategoriesPanel,
  ListenContentTab,
  PublishPanel,
  ReadContentTab,
  SummaryTab,
  TagsPanel,
} from '@/components/admin/books';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './page.module.scss';
import { useBookVersionLogic } from './useBookVersionLogic';

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

  const {
    version,
    error,
    isLoading,
    activeTab,
    setActiveTab,
    isSubmitting,
    handleSubmit,
    handlePublishSuccess,
    handleUnpublishSuccess,
    handleCategoriesChange,
    handleTagsChange,
    router,
  } = useBookVersionLogic(versionId);

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

  const FORM_ID = 'book-version-form';

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <div className={styles.topRow}>
          <div className={styles.titleGroup}>
            <button
              aria-label="Back to Books List"
              className={styles.backArrow}
              onClick={() => router.push(`/admin/${lang}/books`)}
              type="button"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className={styles.pageTitle}>Edit Book Version</h1>
              <p className={styles.versionMeta}>
                {version.title} • {version.language.toUpperCase()} • {version.status}
              </p>
            </div>
          </div>
          <div className={styles.actionsGroup}>
            <button
              className={styles.secondaryButton}
              onClick={() =>
                router.push(
                  `/admin/${lang}/books/new?bookId=${version.bookId}&title=${encodeURIComponent(version.title)}&author=${encodeURIComponent(version.author)}`
                )
              }
              type="button"
            >
              <Plus size={16} />
              Add Another Version
            </button>
            <button className={styles.secondaryButton} type="button">
              <Eye size={16} />
              Preview
            </button>
            <button
              className={styles.primaryButton}
              disabled={isSubmitting}
              form={FORM_ID}
              type="submit"
            >
              <Save size={16} />
              {isSubmitting ? 'Saving...' : 'Update Version'}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.contentLayout}>
        <div className={styles.mainContent}>
          <BookVersionTabs
            activeTab={activeTab}
            listenContent={<ListenContentTab versionId={versionId} />}
            onTabChange={setActiveTab}
            overviewContent={
              <BookForm
                id={FORM_ID}
                initialData={version}
                isSubmitting={isSubmitting}
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
