'use client';

import { useState } from 'react';
import type { FC } from 'react';
import { ArrowLeft, Eye, Languages, Plus, Save, Download } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  BookForm,
  BookVersionSwitcher,
  BookVersionTabs,
  CategoriesPanel,
  ListenContentTab,
  PublishPanel,
  ReadContentTab,
  RightsContentHashPanel,
  RightsOverridePanel,
  RightsTab,
  SummaryTab,
  AnalysisTab,
  TagsPanel,
  ImportModal,
} from '@/components/admin/books';
import { Button } from '@/components/admin/common/Button';
import { Spinner } from '@/components/admin/shared';
import {
  RunHistory,
  TranslateButton,
  TranslationRunBlock,
} from '@/components/admin/translation-run';
import { UserRole } from '@/lib/auth/constants';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './page.module.scss';
import { PREVIEW_SOURCE_EDITOR, PREVIEW_SOURCE_PARAM } from './preview/preview.constants';
import { useBookVersionLogic } from './useBookVersionLogic';

/**
 * Book version edit page
 *
 * Loads existing version and allows editing its data
 */
const EditBookVersionPage: FC = () => {
  const { lang, id: versionId } = useParams<{ lang: SupportedLang; id: string }>();

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const {
    version,
    error,
    isLoading,
    activeTab,
    setActiveTab,
    isSubmitting,
    publishBlockedReason,
    handleSubmit,
    handlePublishSuccess,
    handleUnpublishSuccess,
    handleCategoriesChange,
    handleTagsChange,
    handleImportJson,
    isImporting,
    router,
  } = useBookVersionLogic(versionId);

  // Сравнение моделей и перевод тратят деньги - только `admin` (F05, U6); ручки отказывают остальным.
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin =
    sessionStatus === 'authenticated' &&
    !session?.error &&
    (session?.user?.roles ?? []).includes(UserRole.ADMIN);

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="lg" />
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
              leftIcon={<Download size={16} />}
              onClick={() => setIsImportModalOpen(true)}
            >
              Import JSON
            </Button>
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
            {/* Preview shows the text reader: an audio or referral version has no text to show. */}
            {version.type === 'text' && (
              <Button
                variant="secondary"
                leftIcon={<Eye size={16} />}
                onClick={() =>
                  // A new tab keeps the editor open next to the preview: fix, switch back, look again.
                  // No `noopener` on purpose: only a tab with an opener can be closed by the
                  // preview's back arrow in every browser; without one it would load a second
                  // editor of this version. The page is our own admin, same origin, and the
                  // preview never touches `window.opener`.
                  window.open(
                    `/admin/${lang}/books/versions/${versionId}/preview?${PREVIEW_SOURCE_PARAM}=${PREVIEW_SOURCE_EDITOR}`,
                    '_blank'
                  )
                }
              >
                Preview
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="secondary"
                leftIcon={<Languages size={16} />}
                onClick={() =>
                  router.push(`/admin/${lang}/books/versions/${versionId}/translation-compare`)
                }
              >
                Compare Models
              </Button>
            )}
            {isAdmin && <TranslateButton versionId={versionId} bookId={version.bookId} />}
            <Button
              type="submit"
              size="md"
              form={FORM_ID}
              leftIcon={<Save size={16} />}
              loading={isSubmitting}
            >
              Update Version
            </Button>
          </div>
        </div>
        <div className={styles.versionSwitcherRow}>
          <BookVersionSwitcher bookId={version.bookId} currentVersionId={versionId} lang={lang} />
        </div>
      </div>

      <ImportModal
        isOpen={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        onImport={handleImportJson}
        isLoading={!!isImporting}
      />

      <div className={styles.contentLayout}>
        <div className={styles.mainContent}>
          {isAdmin && (
            <>
              <TranslationRunBlock versionId={versionId} bookId={version.bookId} lang={lang} />
              <RunHistory versionId={versionId} bookId={version.bookId} lang={lang} />
            </>
          )}
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
            rightsContent={<RightsTab versionId={versionId} bookId={version.bookId} lang={lang} />}
            readContent={<ReadContentTab versionId={versionId} />}
            summaryContent={<SummaryTab versionId={versionId} />}
            analysisContent={<AnalysisTab versionId={versionId} version={version} />}
          />
        </div>

        <aside className={styles.sidebar}>
          <PublishPanel
            onPublishSuccess={handlePublishSuccess}
            onUnpublishSuccess={handleUnpublishSuccess}
            publishBlockedReason={publishBlockedReason}
            status={version.status}
            versionId={versionId}
          />

          <div className={styles.sidebarSpacer} />

          <RightsOverridePanel
            bookId={version.bookId}
            status={version.status}
            versionId={versionId}
          />

          <div className={styles.sidebarSpacer} />

          <RightsContentHashPanel versionId={versionId} />

          <div className={styles.sidebarSpacer} />

          <CategoriesPanel
            onCategoriesChange={handleCategoriesChange}
            selectedCategories={version.categories || []}
            versionId={versionId}
            type="category"
          />

          <div className={styles.sidebarSpacer} />

          <CategoriesPanel
            onCategoriesChange={handleCategoriesChange}
            selectedCategories={version.categories || []}
            versionId={versionId}
            type="genre"
          />

          <div className={styles.sidebarSpacer} />

          <CategoriesPanel
            onCategoriesChange={handleCategoriesChange}
            selectedCategories={version.categories || []}
            versionId={versionId}
            type="collection"
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
