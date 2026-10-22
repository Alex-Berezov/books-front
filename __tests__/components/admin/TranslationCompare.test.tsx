import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TranslationCompare,
  useResetOnChange,
} from '@/components/admin/translation-compare/TranslationCompare/TranslationCompare';
import {
  canStartCompare,
  refusalText,
  startRequest,
} from '@/components/admin/translation-compare/TranslationCompare/translationCompare.utils';
import { ApiError } from '@/types/api';
import type { TranslationCompareParams } from '@/types/api-schema';

/**
 * F05-3: экран сравнения моделей. Хуки подменены: проверяется, что экран показывает и когда даёт
 * запустить сравнение (деньги тратятся только после выбора 2–4 моделей и готовой оценки).
 */

const hooks = vi.hoisted(() => ({
  status: { data: { state: 'ENABLED' } } as { data: unknown },
  estimate: { data: undefined, isSuccess: false, isError: false, error: null } as Record<
    string,
    unknown
  >,
  list: { data: { items: [] as unknown[] }, isLoading: false, isError: false } as Record<
    string,
    unknown
  >,
  openedWith: vi.fn(),
  mutate: vi.fn(),
  opened: undefined as unknown,
}));

vi.mock('@/api/hooks', () => ({
  COMPARE_MIN_MODELS: 2,
  COMPARE_MAX_MODELS: 4,
  useChapterTitles: () => ({ data: { items: [{ number: 1, title: 'One' }] }, isError: false }),
  useLlmModels: () => ({ data: { items: [] }, isError: false }),
  useLlmStatus: () => hooks.status,
  useTranslationCompares: () => hooks.list,
  useTranslationCompareEstimate: () => hooks.estimate,
  useStartTranslationCompare: () => ({
    mutate: hooks.mutate,
    reset: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useTranslationCompare: (id: string | null) => {
    hooks.openedWith(id);
    return { data: hooks.opened, isLoading: false, isError: false };
  },
  useCompareOperation: () => ({
    cancel: { mutate: vi.fn(), isPending: false, error: null },
    resume: { mutate: vi.fn(), isPending: false, error: null },
  }),
}));

const pausedCompare = (id: string) => ({
  id,
  bookVersionId: 'v1',
  chapterNumber: 1,
  language: 'es',
  models: ['a/one', 'b/two'],
  createdAt: '2026-10-22T00:00:00.000Z',
  chapterTitle: null,
  originalHtml: '<p>x</p>',
  chunks: 1,
  waitingForContext: false,
  splitCostUsd: null,
  results: [],
  operation: {
    id: `op-${id}`,
    kind: 'compare',
    status: 'paused',
    pauseReason: 'LIMIT_REACHED',
    bookVersionId: 'v1',
    limitUsd: '1',
    reservedUsd: '0',
    spentUsd: '1',
    createdAt: '2026-10-22T00:00:00.000Z',
    updatedAt: '2026-10-22T00:00:00.000Z',
  },
});

const apiError = (message: string, code: string) =>
  new ApiError({ statusCode: 409, error: 'Conflict', message, data: { code } } as never);

const params = (models: string[]): TranslationCompareParams => ({
  chapterNumber: 1,
  targetLanguage: 'es',
  models,
});

describe('правила запуска сравнения', () => {
  const ready = {
    keyMissing: false,
    params: params(['a', 'b']),
    limit: '',
    estimateReady: true,
    pending: false,
  };

  it('2–4 модели, оценка готова, лимит пустой или верный — можно', () => {
    expect(canStartCompare(ready)).toBe(true);
    expect(canStartCompare({ ...ready, params: params(['a', 'b', 'c', 'd']), limit: '2.5' })).toBe(
      true
    );
  });

  it.each([
    ['одна модель', { params: params(['a']) }],
    ['пять моделей', { params: params(['a', 'b', 'c', 'd', 'e']) }],
    ['глава или язык не выбраны', { params: null }],
    ['лимит не деньги', { limit: 'abc' }],
    ['оценки нет', { estimateReady: false }],
    ['ключа нет', { keyMissing: true }],
    ['запуск уже идёт', { pending: true }],
  ])('%s — нельзя', (_, over) => {
    expect(canStartCompare({ ...ready, ...over })).toBe(false);
  });

  it('пустой лимит в тело запуска не уходит, заданный — без пробелов', () => {
    expect(startRequest(params(['a', 'b']), '  ')).toEqual(params(['a', 'b']));
    expect(startRequest(params(['a', 'b']), ' 3 ')).toEqual({
      ...params(['a', 'b']),
      limitUsd: '3',
    });
  });

  it('отказ — подпись по коду, иначе сообщение, иначе общая фраза', () => {
    const coded = apiError('x', 'NOT_IN_INTAKE');
    expect(refusalText(coded)).toBe('The target language is not in the rights intake of the book.');
    expect(refusalText(apiError('Raw message', 'SOMETHING_NEW'))).toBe('Raw message');
    expect(refusalText(new Error('boom'))).toBe('The request failed');
  });
});

describe('экран сравнения', () => {
  beforeEach(() => {
    hooks.status = { data: { state: 'ENABLED' } };
    hooks.estimate = { data: undefined, isSuccess: false, isError: false, error: null };
    hooks.list = { data: { items: [] }, isLoading: false, isError: false };
    hooks.openedWith.mockClear();
    hooks.mutate.mockClear();
    hooks.opened = undefined;
  });

  it('другое сравнение открывается со своим состоянием: лимит прошлого не переезжает', () => {
    hooks.opened = pausedCompare('a');
    const { rerender } = render(<TranslationCompare lang="en" versionId="v1" />);
    fireEvent.change(screen.getByLabelText('New limit, $ (optional)'), {
      target: { value: '5' },
    });

    hooks.opened = pausedCompare('b');
    rerender(<TranslationCompare lang="en" versionId="v1" />);

    expect(screen.getByLabelText('New limit, $ (optional)')).toHaveValue('');
  });

  it('без выбора запуск закрыт; прошлых сравнений нет — так и сказано', () => {
    render(<TranslationCompare lang="en" versionId="v1" />);

    expect(screen.getByRole('button', { name: 'Start compare' })).toBeDisabled();
    expect(screen.getByText('No compares yet.')).toBeTruthy();
  });

  it('без ключа — плашка, запуск закрыт', () => {
    hooks.status = { data: { state: 'DISABLED' } };

    render(<TranslationCompare lang="en" versionId="v1" />);

    expect(screen.getByText(/OpenRouter key is not configured/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start compare' })).toBeDisabled();
  });

  it('отказ оценки показан подписью по коду', () => {
    hooks.estimate = {
      data: undefined,
      isSuccess: false,
      isError: true,
      error: apiError('x', 'NOT_ORIGINAL_VERSION'),
    };

    render(<TranslationCompare lang="en" versionId="v1" />);

    expect(screen.getByText(/This version is not the original/)).toBeTruthy();
  });

  it('прошлое сравнение открывается по клику', () => {
    hooks.list = {
      data: {
        items: [
          {
            id: 'c7',
            bookVersionId: 'v1',
            chapterNumber: 1,
            language: 'es',
            models: ['a/one', 'b/two'],
            createdAt: '2026-10-22T00:00:00.000Z',
            operation: { status: 'done', spentUsd: '0.1', pauseReason: null },
          },
        ],
      },
      isLoading: false,
      isError: false,
    };

    render(<TranslationCompare lang="en" versionId="v1" />);
    fireEvent.click(screen.getByRole('button', { name: /Chapter 1 → ES: a\/one, b\/two/ }));

    expect(hooks.openedWith).toHaveBeenLastCalledWith('c7');
    expect(hooks.mutate).not.toHaveBeenCalled();
  });
});

describe('сброс отказа запуска при смене параметров', () => {
  it('пока запуск идёт, мутация не сбрасывается: кнопка не открывается для второго платного запуска', () => {
    const reset = vi.fn();
    // Как в форме: выбор моделей - состояние, ссылка меняется только при смене выбора.
    const ab = ['a', 'b'];
    const a = ['a'];
    const ab2 = ['a', 'b'];
    const ac = ['a', 'c'];
    const { rerender } = renderHook(
      ({ pending, models }) => useResetOnChange({ reset, isPending: pending }, [models]),
      { initialProps: { pending: false, models: ab } }
    );
    reset.mockClear();

    rerender({ pending: true, models: a });
    rerender({ pending: true, models: ab2 });
    expect(reset).not.toHaveBeenCalled();

    // Запуск закончился отказом - его ошибка остаётся, пока параметры не сменят снова.
    rerender({ pending: false, models: ab2 });
    expect(reset).not.toHaveBeenCalled();
    rerender({ pending: false, models: ac });
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
