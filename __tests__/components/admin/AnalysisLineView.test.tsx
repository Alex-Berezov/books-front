import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LINKABLE_VERSION_TABS } from '@/components/admin/books/BookVersionTabs/versionTab.constants';
import { AnalysisLineView } from '@/components/admin/translation-run/AnalysisLineView';
import type { TranslationRunAnalysis } from '@/types/api-schema';

const failed: TranslationRunAnalysis = {
  status: 'failed',
  reason: 'DRAFT_DATA_INVALID',
  draftId: 'cd2',
  operationStatus: 'failed',
  pauseReason: null,
  stepsDone: 1,
  stepsTotal: 5,
  flaggedItems: 0,
  failedItems: 0,
  coreReady: false,
  spentUsd: '0',
};

/** F07-3b: строка анализа языка запуска и ссылка на вкладку Analysis версии. */
describe('AnalysisLineView', () => {
  it('ссылка нужна и версия есть — ведёт сразу на вкладку Analysis (?tab=analysis разбирает useBookVersionLogic, тест — bookVersionSlugPerLanguage)', () => {
    render(
      <AnalysisLineView
        writeAnalysis
        language={{ status: 'done', analysis: failed }}
        draftVersionId="draft-es"
        lang="ru"
      />
    );
    expect(screen.getByText(/^Analysis: failed — /)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the Analysis tab' })).toHaveAttribute(
      'href',
      '/admin/ru/books/versions/draft-es?tab=analysis'
    );
    expect(LINKABLE_VERSION_TABS).toContain('analysis');
  });

  it('версии нет (черновик удалён) — строка без ссылки; без Write Analysis — ничего', () => {
    const { container, rerender } = render(
      <AnalysisLineView
        writeAnalysis
        language={{ status: 'done', analysis: failed }}
        draftVersionId={null}
        lang="en"
      />
    );
    expect(screen.getByText(/^Analysis: failed — /)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    rerender(
      <AnalysisLineView
        writeAnalysis={false}
        language={{ status: 'done', analysis: failed }}
        draftVersionId="draft-es"
        lang="en"
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
