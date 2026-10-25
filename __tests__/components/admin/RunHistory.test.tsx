import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RunHistory } from '@/components/admin/translation-run/RunHistory';
import { ApiError } from '@/types/api';
import type { LlmOperation, TranslationRunListItem } from '@/types/api-schema';

/**
 * F05-8: история запусков версии — кто, модели, стоимость, итог по языкам, черновик, отчёт
 * своего запуска, страницы; отказ с «Retry»; без запусков блока нет. Хук и окно отчёта подменены.
 */

const hooks = vi.hoisted(() => ({
  result: {
    data: undefined as unknown,
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  pages: [] as number[],
}));

vi.mock('@/api/hooks', () => ({
  useTranslationRunHistory: (_book: string, _version: string, page: number) => {
    hooks.pages.push(page);
    return hooks.result;
  },
}));

// Окно отчёта — заглушка с номером запуска: видно, чей отчёт открыт.
vi.mock('next/dynamic', () => ({
  default: (load: () => Promise<unknown>) => {
    if (!load.toString().includes('RunReportModal')) {
      throw new Error(`dynamic(): unknown module in ${load.toString()}`);
    }
    const Stub = (props: { runId: string; live: boolean; onClose: () => void }) => (
      <div role="dialog" aria-label={`report ${props.runId} live=${String(props.live)}`}>
        <button type="button" onClick={props.onClose}>
          Close report
        </button>
      </div>
    );
    return Stub;
  },
}));

const operation = (status: LlmOperation['status']): LlmOperation => ({
  id: `op-${status}`,
  kind: 'translation_run',
  status,
  pauseReason: null,
  bookVersionId: 'v1',
  limitUsd: '10',
  reservedUsd: '0',
  spentUsd: '0.5',
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
});

const item = (
  id: string,
  status: LlmOperation['status'],
  over: Partial<TranslationRunListItem> = {}
): TranslationRunListItem => ({
  id,
  bookVersionId: 'v1',
  sourceLanguage: 'en',
  languages: ['es'],
  stageModels: {},
  operation: operation(status),
  createdAt: '2026-10-24T10:00:00.000Z',
  createdBy: { id: 'u1', email: 'admin@example.com', name: 'Ann' },
  models: [{ stage: 'translate', model: 'a/main', fallbacks: ['b/spare'] }],
  costUsd: '1.25000000',
  results: [
    { language: 'es', status: 'done', reason: null, reasonText: null, draftVersionId: 'draft-es' },
  ],
  ...over,
});

const show = (items: TranslationRunListItem[], totalPages = 1, total = items.length) => {
  hooks.result.data = { items, pagination: { page: 1, limit: 10, total, totalPages } };
};

describe('RunHistory', () => {
  beforeEach(() => {
    hooks.result = { data: undefined, isError: false, error: null, refetch: vi.fn() };
    hooks.pages = [];
  });

  it('без запусков блока нет', () => {
    show([]);
    const { container } = render(<RunHistory versionId="v1" bookId="b1" lang="en" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('строка запуска: автор, модели с запасными, стоимость запуска, итог языка и черновик', () => {
    show([item('run-1', 'done')]);
    render(<RunHistory versionId="v1" bookId="b1" lang="en" />);

    const row = screen.getAllByRole('row')[1];
    expect(within(row).getByText('Ann (admin@example.com)')).toBeInTheDocument();
    expect(within(row).getByText('Translation: a/main (fallbacks: b/spare)')).toBeInTheDocument();
    // Стоимость — `costUsd` (все операции запуска), а не траты операции запуска.
    expect(within(row).getByText('$1.25')).toBeInTheDocument();
    expect(within(row).queryByText('$0.5')).not.toBeInTheDocument();
    expect(within(row).getByText('finished')).toBeInTheDocument();
    expect(within(row).getByText(/ES: done/)).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'Open draft' })).toHaveAttribute(
      'href',
      '/admin/en/books/versions/draft-es'
    );
  });

  it('удалённый автор, отменённый и упавший языки — без черновика, с причиной', () => {
    show([
      item('run-2', 'cancelled', {
        createdBy: null,
        results: [
          {
            language: 'fr',
            status: 'cancelled',
            reason: null,
            reasonText: null,
            draftVersionId: null,
          },
          {
            language: 'ru',
            status: 'failed',
            reason: 'VERSION_EXISTS',
            reasonText: null,
            draftVersionId: null,
          },
          {
            language: 'pt',
            status: 'failed',
            reason: 'CREATE_REJECTED',
            reasonText: 'Slug is taken',
            draftVersionId: null,
          },
        ],
      }),
    ]);
    render(<RunHistory versionId="v1" bookId="b1" lang="en" />);

    expect(screen.getByText('deleted user')).toBeInTheDocument();
    expect(screen.getByText('FR: cancelled')).toBeInTheDocument();
    expect(screen.getByText('RU: A version in this language already exists.')).toBeInTheDocument();
    // Текст сервиса, отказавшего в черновике, — как в блоке хода, а не «no text».
    expect(
      screen.getByText('PT: The draft version was refused: Slug is taken')
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open draft' })).not.toBeInTheDocument();
  });

  it('незакончившийся язык — статусом отчёта и остановкой словами, а не кодом', () => {
    show([
      item('run-3', 'paused', {
        results: [
          {
            language: 'es',
            status: 'running',
            reason: 'LLM_BUDGET_EXCEEDED:operation',
            reasonText: null,
            draftVersionId: null,
          },
          {
            language: 'fr',
            status: 'pending',
            reason: null,
            reasonText: null,
            draftVersionId: null,
          },
        ],
      }),
    ]);
    render(<RunHistory versionId="v1" bookId="b1" lang="en" />);

    expect(screen.getByText('ES: in progress, the run limit is reached')).toBeInTheDocument();
    expect(screen.getByText('FR: waiting')).toBeInTheDocument();
  });

  it('«Report» открывает отчёт своего запуска; идущий — живой', () => {
    show([item('run-live', 'active'), item('run-old', 'cancelled')]);
    render(<RunHistory versionId="v1" bookId="b1" lang="en" />);

    const rows = screen.getAllByRole('row').slice(1);
    fireEvent.click(within(rows[1]).getByRole('button', { name: 'Report' }));
    expect(screen.getByRole('dialog', { name: 'report run-old live=false' })).toBeInTheDocument();

    fireEvent.click(within(rows[0]).getByRole('button', { name: 'Report' }));
    expect(screen.getByRole('dialog', { name: 'report run-live live=true' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close report' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('«живой» отчёт — по последнему чтению истории: запуск кончился при открытом окне', () => {
    show([item('run-live', 'active')]);
    const { rerender } = render(<RunHistory versionId="v1" bookId="b1" lang="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'Report' }));
    expect(screen.getByRole('dialog', { name: 'report run-live live=true' })).toBeInTheDocument();

    show([item('run-live', 'done')]);
    rerender(<RunHistory versionId="v1" bookId="b1" lang="en" />);
    expect(screen.getByRole('dialog', { name: 'report run-live live=false' })).toBeInTheDocument();
  });

  it('страницы: вторая страница запрашивается хуком', () => {
    show([item('run-1', 'done')], 3);
    render(<RunHistory versionId="v1" bookId="b1" lang="en" />);

    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(hooks.pages.at(-1)).toBe(2);
  });

  it('страница опустела за концом списка — блок на месте и уходит на последнюю', () => {
    show([item('run-1', 'done')], 3);
    const { rerender } = render(<RunHistory versionId="v1" bookId="b1" lang="en" />);
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(hooks.pages.at(-1)).toBe(3);

    // Запуски удалены вместе с версией: на третьей пусто, всего страниц одна.
    show([], 1, 4);
    rerender(<RunHistory versionId="v1" bookId="b1" lang="en" />);
    expect(hooks.pages.at(-1)).toBe(1);
    expect(screen.getByRole('region', { name: 'Translation history' })).toBeInTheDocument();
  });

  it('не перечиталось при показанной странице — плашка над таблицей, строки на месте', () => {
    show([item('run-1', 'done')]);
    hooks.result = {
      ...hooks.result,
      isError: true,
      error: new ApiError({ message: 'Boom', statusCode: 500, error: 'Internal' }),
    };
    render(<RunHistory versionId="v1" bookId="b1" lang="en" />);

    expect(screen.getByText(/Translation history:/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Report' })).toBeInTheDocument();
  });

  it('отказ — плашка с «Retry», а не пустота', () => {
    hooks.result = {
      data: undefined,
      isError: true,
      error: new ApiError({ message: 'Boom', statusCode: 500, error: 'Internal' }),
      refetch: vi.fn(),
    };
    render(<RunHistory versionId="v1" bookId="b1" lang="en" />);

    expect(screen.getByText(/Translation history:/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(hooks.result.refetch).toHaveBeenCalledTimes(1);
  });
});
