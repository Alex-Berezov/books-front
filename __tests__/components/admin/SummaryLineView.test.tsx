import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SummaryLineView } from '@/components/admin/translation-run/SummaryLineView';
import type { TranslationRunSummary } from '@/types/api-schema';

const failed: TranslationRunSummary = {
  status: 'failed',
  reason: 'DRAFT_NO_PLAN',
  draftId: 'cd1',
  operationStatus: 'failed',
  pauseReason: null,
  plannedSections: null,
  sectionsDone: 0,
  fullDone: false,
  briefDone: false,
  flaggedTexts: 0,
  failedTexts: 0,
  spentUsd: '0',
};

/** F06-5b: строка раздела языка запуска и ссылка на вкладку Summary версии. */
describe('SummaryLineView', () => {
  it('ссылка нужна и версия есть — ведёт сразу на вкладку Summary', () => {
    render(
      <SummaryLineView
        writeSummary
        language={{ status: 'done', summary: failed }}
        draftVersionId="draft-es"
        lang="ru"
      />
    );
    expect(screen.getByText(/^Summary: failed — /)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the Summary tab' })).toHaveAttribute(
      'href',
      '/admin/ru/books/versions/draft-es?tab=summary'
    );
  });

  it('ссылка нужна, а версии нет (черновик удалён) — строка без ссылки', () => {
    render(
      <SummaryLineView
        writeSummary
        language={{ status: 'done', summary: failed }}
        draftVersionId={null}
        lang="en"
      />
    );
    expect(screen.getByText(/^Summary: failed — /)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('строки нет — ничего не рисуется', () => {
    const { container } = render(
      <SummaryLineView
        writeSummary={false}
        language={{ status: 'done', summary: failed }}
        draftVersionId="draft-es"
        lang="en"
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('не начат — подсказка «Write Summary on the Summary tab» сама ссылка на вкладку (Р7)', () => {
    const { container } = render(
      <SummaryLineView
        writeSummary
        language={{
          status: 'done',
          summary: { ...failed, status: 'skipped', reason: 'LLM_CEILING_REACHED' },
        }}
        draftVersionId="draft-es"
        lang="en"
      />
    );
    expect(container).toHaveTextContent(
      'Summary: not started — the spending ceiling is reached: raise it in LLM settings. Write Summary on the Summary tab'
    );
    expect(screen.getByRole('link', { name: 'Write Summary on the Summary tab' })).toHaveAttribute(
      'href',
      '/admin/en/books/versions/draft-es?tab=summary'
    );
  });
});
