import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render as baseRender, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COMPARE_REFETCH_MS, compareRefetchInterval } from '@/api/hooks/useTranslationCompare';
import { CompareResult } from '@/components/admin/translation-compare/TranslationCompare/CompareResult';
import type { LlmOperation, TranslationCompare } from '@/types/api-schema';

const llm = vi.hoisted(() => ({ resume: vi.fn(), cancel: vi.fn() }));

vi.mock('@/api/endpoints/admin/llm', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  resumeLlmOperation: llm.resume,
  cancelLlmOperation: llm.cancel,
}));

/** Колонки зовут ручки операции: клиент react-query свой на каждый тест. */
const render = (ui: ReactElement) =>
  baseRender(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>
  );

const operation = (over: Partial<LlmOperation> = {}): LlmOperation => ({
  id: 'op',
  kind: 'compare',
  status: 'done',
  pauseReason: null,
  bookVersionId: 'v1',
  limitUsd: '1.00000000',
  reservedUsd: '0.00000000',
  spentUsd: '0.12000000',
  createdAt: '2026-10-22T00:00:00.000Z',
  updatedAt: '2026-10-22T00:00:00.000Z',
  ...over,
});

const compare = (over: Partial<TranslationCompare> = {}): TranslationCompare => ({
  id: 'c1',
  bookVersionId: 'v1',
  chapterNumber: 3,
  language: 'es',
  operation: operation(),
  models: ['a/one', 'b/two'],
  createdAt: '2026-10-22T00:00:00.000Z',
  chapterTitle: 'Rain',
  originalHtml: '<p>Anna leaves.</p>',
  chunks: 2,
  waitingForContext: false,
  splitCostUsd: null,
  results: [
    {
      model: 'a/one',
      position: 0,
      status: 'done',
      chunksDone: 2,
      html: '<p>Ana se va.</p>',
      error: null,
      costUsd: '0.10000000',
      inputTokens: 1200,
      outputTokens: 800,
      durationMs: 4200,
    },
    {
      model: 'b/two',
      position: 1,
      status: 'failed',
      chunksDone: 1,
      html: null,
      error: 'COMPARE_INVALID_RESPONSE',
      costUsd: '0.02000000',
      inputTokens: 300,
      outputTokens: 0,
      durationMs: 900,
    },
  ],
  ...over,
});

describe('колонки сравнения (F05-3)', () => {
  it('оригинал и колонка на каждую модель: текст, стоимость, причина отказа', () => {
    render(<CompareResult compare={compare()} />);

    expect(
      within(screen.getByRole('article', { name: 'Original' })).getByText('Anna leaves.')
    ).toBeTruthy();
    const done = screen.getByRole('article', { name: 'a/one' });
    expect(within(done).getByText('Ana se va.')).toBeTruthy();
    expect(
      within(done).getByText(/Done · \$0\.1 · 1200 in \/ 800 out · 4\.2 s · 2\/2 pieces/)
    ).toBeTruthy();
    const failed = screen.getByRole('article', { name: 'b/two' });
    expect(within(failed).getByText(/Failed: answers did not match the blocks/)).toBeTruthy();
    // Частичного текста упавшей модели нет.
    expect(within(failed).queryByText(/Ana/)).toBeNull();
  });

  it('недоделанная модель операции на паузе — остановлена её причиной', () => {
    const paused = compare({
      operation: operation({ status: 'paused', pauseReason: 'LIMIT_REACHED' }),
      results: [{ ...compare().results[1], status: 'queued', error: null, chunksDone: 0 }],
    });
    render(<CompareResult compare={paused} />);

    expect(
      within(screen.getByRole('article', { name: 'b/two' })).getByText(
        /Paused: the compare limit is reached/
      )
    ).toBeTruthy();
  });

  it('пока строятся досье и глоссарий, это сказано в ходе', () => {
    render(
      <CompareResult
        compare={compare({ operation: operation({ status: 'active' }), waitingForContext: true })}
      />
    );

    expect(screen.getByText(/Building the dossier and glossary/)).toBeTruthy();
  });

  describe('продолжить и отменить (С9)', () => {
    beforeEach(() => {
      llm.resume.mockReset().mockResolvedValue(operation({ status: 'active' }));
      llm.cancel.mockReset().mockResolvedValue(operation({ status: 'cancelled' }));
    });

    it('сравнение на паузе продолжается с новым лимитом', async () => {
      render(
        <CompareResult
          compare={compare({
            operation: operation({ status: 'paused', pauseReason: 'LIMIT_REACHED' }),
          })}
        />
      );

      fireEvent.change(screen.getByLabelText('New limit, $ (optional)'), {
        target: { value: '2.5' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

      await waitFor(() => expect(llm.resume).toHaveBeenCalledWith('op', '2.5'));
    });

    it('неверный лимит не отправляется', () => {
      render(
        <CompareResult
          compare={compare({
            operation: operation({ status: 'paused', pauseReason: 'LIMIT_REACHED' }),
          })}
        />
      );

      fireEvent.change(screen.getByLabelText('New limit, $ (optional)'), {
        target: { value: 'abc' },
      });

      expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    });

    it('у законченного сравнения действий нет, у идущего — только отмена', () => {
      const { unmount } = render(<CompareResult compare={compare()} />);
      expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
      expect(screen.queryByRole('button', { name: /Cancel compare/ })).toBeNull();
      unmount();

      render(<CompareResult compare={compare({ operation: operation({ status: 'active' }) })} />);
      expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
      expect(screen.getByRole('button', { name: /Cancel compare/ })).toBeTruthy();
    });
  });

  it('опрос идёт, только пока операция active', () => {
    expect(compareRefetchInterval(compare({ operation: operation({ status: 'active' }) }))).toBe(
      COMPARE_REFETCH_MS
    );
    for (const status of ['paused', 'done', 'failed', 'cancelled'] as const) {
      expect(compareRefetchInterval(compare({ operation: operation({ status }) }))).toBe(false);
    }
    expect(compareRefetchInterval(undefined)).toBe(false);
    // Запрос упал: опрос встаёт, иначе общий тост 5xx на каждый цикл.
    expect(
      compareRefetchInterval(compare({ operation: operation({ status: 'active' }) }), true)
    ).toBe(false);
  });
});
