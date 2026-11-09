import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SummaryTab } from '@/components/admin/books/SummaryTab';
import type { BookSummaryDetail, SummaryWrite, SummaryWriteItem } from '@/types/api-schema';

/**
 * F06-3, решение арбитра `F06 | F06-3` (03.11.2026), Б1: форма вкладки заполнилась текстом без
 * записи хода, затем пришёл первый ответ хода с записанным полным — поле берёт текст хода, и Save
 * не отправляет прежний. Настоящие вкладка, ход и QueryClient; подменены только ручки.
 */

const api = vi.hoisted(() => ({
  getBookSummary: vi.fn(),
  upsertBookSummary: vi.fn(),
  getSummaryWrite: vi.fn(),
}));
vi.mock('@/api/endpoints/admin/bookSummaries', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getBookSummary: api.getBookSummary,
  upsertBookSummary: api.upsertBookSummary,
}));
vi.mock('@/api/endpoints/admin/summary-write', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSummaryWrite: api.getSummaryWrite,
}));
vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: vi.fn() }) }));
vi.mock('@/components/admin/books/SummaryTab/SummarySections', () => ({
  SummarySections: () => null,
}));
vi.mock('@/components/admin/common/AdminRichTextEditor', () => ({
  AdminRichTextEditor: (props: { id: string; value: string; onChange: (html: string) => void }) => (
    <textarea
      data-testid={props.id}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
    />
  ),
}));
// Ход — настоящий компонент, без отложенной подгрузки.
vi.mock('next/dynamic', async () => {
  const real = await vi.importActual<
    typeof import('@/components/admin/books/SummaryTab/SummaryWrite')
  >('@/components/admin/books/SummaryTab/SummaryWrite');
  return { default: () => real.SummaryWrite };
});

const summary = (full: string): BookSummaryDetail => ({
  id: 's1',
  summary: full,
  hasText: true,
  brief: null,
  briefHasText: false,
  updatedAt: '2026-11-03T00:00:00.000Z',
});

const written: SummaryWriteItem = {
  index: 0,
  target: 'full',
  number: null,
  title: null,
  readerChapter: null,
  html: '<p>Run full.</p>',
  attempt: 1,
  verdict: 'ok',
  remarks: [],
  review: { kind: 'answered', model: 'm' },
  outcome: 'written',
  failedReason: null,
  authorModel: 'a',
  regenFailedReason: null,
  regenerating: false,
  regenOperationId: null,
  regenOperationStatus: null,
  regenPauseReason: null,
};

const run: SummaryWrite = {
  id: 'd1',
  bookVersionId: 'v1',
  status: 'ready',
  language: 'en',
  failedReason: null,
  waitingFor: null,
  operation: {
    id: 'op-1',
    kind: 'draft',
    status: 'done',
    pauseReason: null,
    bookVersionId: 'v1',
    limitUsd: '2',
    reservedUsd: '0',
    spentUsd: '1',
    createdAt: '2026-11-03T00:00:00.000Z',
    updatedAt: '2026-11-03T00:00:00.000Z',
  },
  plannedSections: 1,
  sectionsDone: 1,
  owns: { sections: true, full: true, brief: true },
  items: [written],
  chapterChanges: [],
  createdAt: '2026-11-03T00:00:00.000Z',
  updatedAt: '2026-11-03T00:00:00.000Z',
};

describe('SummaryTab with the summary run: the first answer of the run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('a full summary the run wrote after the form was filled goes into the field; Save sends it', async () => {
    let server = summary('<p>Old full.</p>');
    api.getBookSummary.mockImplementation(() => Promise.resolve(server));
    api.upsertBookSummary.mockImplementation((_v: string, data: { summary: string }) =>
      Promise.resolve(summary(data.summary))
    );
    let answerRun: (state: { draft: SummaryWrite }) => void = () => undefined;
    api.getSummaryWrite.mockImplementation(() => new Promise((resolve) => (answerRun = resolve)));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <SummaryTab versionId="v1" isAdmin lang="en" />
      </QueryClientProvider>
    );
    await waitFor(() => expect(screen.getByTestId('summaryText')).toHaveValue('<p>Old full.</p>'));

    server = summary('<p>Run full.</p>');
    answerRun({ draft: run });
    await waitFor(() => expect(screen.getByTestId('summaryText')).toHaveValue('<p>Run full.</p>'));

    fireEvent.click(screen.getByRole('button', { name: 'Save Summary' }));
    await waitFor(() => expect(api.upsertBookSummary).toHaveBeenCalledTimes(1));
    expect(api.upsertBookSummary).toHaveBeenCalledWith(
      'v1',
      { summary: '<p>Run full.</p>' },
      { expectedUpdatedAt: '2026-11-03T00:00:00.000Z' }
    );
  });
});
