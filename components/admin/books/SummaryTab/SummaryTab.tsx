'use client';

import type { FC } from 'react';
import dynamic from 'next/dynamic';
import { useBookSummarySections } from '@/api/hooks';
import { Button } from '@/components/admin/common/Button';
import { Spinner } from '@/components/admin/shared';
import type { SummaryTabProps } from './SummaryTab.types';
import { SummaryFormField } from './SummaryFormField';
import { SummarySections } from './SummarySections';
import styles from './SummaryTab.module.scss';
import { useSummaryTab } from './useSummaryTab';

// Заготовка из досье — только у `admin` и по кнопке: в бандл страницы версии не входит.
const SummaryDraft = dynamic(() => import('./SummaryDraft').then((m) => m.SummaryDraft), {
  ssr: false,
});
const ApplyDraftText = dynamic(() => import('./SummaryDraft').then((m) => m.ApplyDraftText), {
  ssr: false,
});

/**
 * Tab for managing book summary
 *
 * The plot retelling shown on the public page `/{lang}/book/{slug}/summary`, the very short summary
 * (the "In brief" block on top of it, F04) and the summary sections (`/summary/{n}`, F04).
 * Key takeaways and themes live in the «Analysis» tab (own `BookAnalysis` record, F03).
 */
export const SummaryTab: FC<SummaryTabProps> = (props) => {
  const {
    formData,
    handleFieldChange,
    handleSave,
    handleSaveBrief,
    hasFullSummary,
    briefMinutes,
    isLoading,
    isSaving,
    isSavingBrief,
    loadFailed,
  } = useSummaryTab(props);
  const { isAdmin = false, lang = 'en', versionId } = props;
  // Тот же запрос, что у списка разделов ниже (общий ключ): лишнего обращения нет.
  const sectionsQuery = useBookSummarySections(versionId);
  // Не загрузилось — не «разделов нет»: шаг закрыт своей причиной (L-013). Пустой текст раздела
  // список не показывает — его отсекает сервер (409 `SUMMARY_SECTIONS_MISSING`).
  const fullBlockedHint = sectionsQuery.isError
    ? 'Failed to load the saved sections.'
    : sectionsQuery.isPending
      ? 'Loading the saved sections…'
      : (sectionsQuery.data?.sections.length ?? 0) > 0
        ? null
        : 'Save the summary sections first.';

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Book Summary</h2>

      {loadFailed ? (
        <p className={styles.error} role="alert">
          Failed to load the summary. Reload the tab before editing.
        </p>
      ) : (
        <>
          <SummaryFormField
            hint="Plot only, including the ending; use Heading 2 for parts or chapters. Public page: /book/<slug>/summary"
            id="summaryText"
            label="Summary"
            onChange={handleFieldChange}
            placeholder="Retell the plot of the book in order..."
            rows={24}
            value={formData.summaryText}
          />

          {isAdmin && (
            <SummaryDraft
              versionId={versionId}
              kind="summary_full"
              lang={lang}
              blockedHint={fullBlockedHint}
            >
              {(draft) =>
                draft.text !== null && (
                  <ApplyDraftText
                    text={draft.text}
                    current={formData.summaryText}
                    field="Summary"
                    onUse={(text) => handleFieldChange('summaryText', text)}
                  />
                )
              }
            </SummaryDraft>
          )}

          <Button onClick={handleSave} loading={isSaving} disabled={isSaving}>
            Save Summary
          </Button>

          <SummaryFormField
            hint='3-5 min read, whole plot including the ending. Not the spoiler-free teaser "Summary (Short, 80-160 words)" on the book page'
            id="briefText"
            label="Very short summary"
            onChange={handleFieldChange}
            placeholder="The whole plot in a few paragraphs..."
            rows={8}
            value={formData.briefText}
          />
          <p className={styles.readingTime} aria-live="polite">
            Reading time: {briefMinutes} min
          </p>
          {!hasFullSummary && <p className={styles.labelHint}>Save the full summary first.</p>}
          {isAdmin && (
            <SummaryDraft
              versionId={versionId}
              kind="summary_brief"
              lang={lang}
              // Подсказка «Save the full summary first.» уже стоит у поля выше.
              blockedHint={hasFullSummary ? null : ''}
            >
              {(draft) =>
                draft.text !== null && (
                  <ApplyDraftText
                    text={draft.text}
                    current={formData.briefText}
                    field="Very short summary"
                    onUse={(text) => handleFieldChange('briefText', text)}
                  />
                )
              }
            </SummaryDraft>
          )}
          <Button
            onClick={handleSaveBrief}
            loading={isSavingBrief}
            disabled={isSavingBrief || !hasFullSummary}
          >
            Save Very Short Summary
          </Button>
        </>
      )}

      <SummarySections versionId={versionId} isAdmin={isAdmin} lang={lang} />
    </div>
  );
};
