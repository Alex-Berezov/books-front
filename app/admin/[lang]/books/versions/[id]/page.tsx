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
import { Button } from '@/components/common/Button';
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
        <Button variant="secondary" onClick={() => router.push(`/admin/${lang}/books`)}>
          Back to Books List
        </Button>
      </div>
    );
  }

  const FORM_ID = 'book-version-form';

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <div className={styles.topRow}>
          <div className={styles.titleGroup}>
            <Button
              variant="ghost"
              ariaLabel="Back to Books List"
              className={styles.backArrow}
              onClick={() => router.push(`/admin/${lang}/books`)}
            >
              <ArrowLeft size={24} />
            </Button>
            <div>
              <h1 className={styles.pageTitle}>Edit Book Version</h1>
              <p className={styles.versionMeta}>
                {version.title} • {version.language.toUpperCase()} • {version.status}
              </p>
            </div>
          </div>
          <div className={styles.actionsGroup}>
            <Button
              variant="secondary"
              leftIcon={<Plus size={16} />}
              onClick={() =>
                router.push(
                  `/admin/${lang}/books/new?bookId=${version.bookId}&title=${encodeURIComponent(version.title)}&author=${encodeURIComponent(version.author)}`
                )
              }
            >
              Add Another Version
            </Button>
            <Button variant="secondary" leftIcon={<Eye size={16} />}>
              Preview
            </Button>
            <Button
              type="submit"
              form={FORM_ID}
              leftIcon={<Save size={16} />}
              loading={isSubmitting}
            >
              Update Version
            </Button>
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
