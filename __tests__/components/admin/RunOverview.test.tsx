import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RunOverview } from '@/components/admin/translation-run/RunOverview';
import type { TranslationRun, TranslationRunReport } from '@/types/api-schema';

/** Сводка запуска вверху экрана перевода: итог, разбивка, отказ чтения с «Retry». */

const state = vi.hoisted(() => ({
  run: { data: undefined as unknown, isError: false, error: null as unknown, refetch: vi.fn() },
  report: {
    data: undefined as unknown,
    isError: false,
    isLoading: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  reportArgs: [] as Array<[string, boolean]>,
}));

// Опрос и «идёт ли запуск» — настоящим правилом хода, подменены только запросы.
vi.mock('@/api/hooks', async () => {
  const real = await vi.importActual<typeof import('@/api/hooks/useTranslationRun')>(
    '@/api/hooks/useTranslationRun'
  );
  return {
    useTranslationRun: () => state.run,
    useTranslationRunReport: (id: string, live: boolean) => {
      state.reportArgs.push([id, live]);
      return state.report;
    },
    translationRunRefetchInterval: real.translationRunRefetchInterval,
  };
});

const run = {
  id: 'r1',
  bookVersionId: 'v1',
  sourceLanguage: 'en',
  dossierId: 'd1',
  stageModels: {},
  operation: { id: 'op', kind: 'translation_run', status: 'done', pauseReason: null },
  operations: [],
  languages: [
    {
      language: 'fr',
      status: 'done',
      flaggedChunks: 5,
      summary: null,
      analysis: {
        status: 'ready',
        operationStatus: 'done',
        failedItems: 0,
        coreReady: false,
        flaggedItems: 0,
        spentUsd: '0.3',
      },
    },
  ],
  writeSummary: false,
  writeAnalysis: true,
  createdAt: '2026-11-16T12:25:39.000Z',
} as unknown as TranslationRun;

const report = {
  id: 'r1',
  bookVersionId: 'v1',
  languages: [{ language: 'fr', summary: null, analysis: { spentUsd: '0.3' } }],
  costs: [],
  breakdown: {
    languages: [{ language: 'fr', translationUsd: '1.2', glossaryUsd: '0.05' }],
    dossierUsd: '0.01',
    unattributedUsd: '0',
  },
  inFlight: { calls: 0, reservedUsd: '0' },
  totalUsd: '1.56',
} as unknown as TranslationRunReport;

describe('RunOverview', () => {
  beforeEach(() => {
    state.run = { data: run, isError: false, error: null, refetch: vi.fn() };
    state.report = {
      data: report,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
  });

  it('с первого взгляда: исход, проблема языка, итог и разбивка по языку и разделам', () => {
    render(<RunOverview runId="r1" bookId="b1" />);

    expect(screen.getByTestId('run-outcome')).toHaveTextContent(
      'Finished, but not everything is done'
    );
    expect(screen.getByText('FR: analysis partly done')).toBeInTheDocument();
    expect(screen.getByTestId('run-total')).toHaveTextContent('$1.56');
    const table = screen.getByRole('table');
    // Колонки Summary нет: у запуска раздел выключен.
    expect(within(table).queryByRole('columnheader', { name: 'Summary' })).not.toBeInTheDocument();
    const fr = within(table).getByRole('row', { name: /FR/ });
    expect(
      within(fr)
        .getAllByRole('cell')
        .map((c) => c.textContent)
    ).toEqual(['$1.25', '$0.3', '$1.55']);
    expect(within(table).getByRole('row', { name: /Dossier/ })).toBeInTheDocument();
    expect(screen.getByText(/Model flags to review: 5/)).toBeInTheDocument();
  });

  it('отказ чтения отчёта — плашка «Cost» с «Retry», исход и проблемы по ходу остаются', () => {
    state.report = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('x'),
      refetch: vi.fn(),
    };
    render(<RunOverview runId="r1" bookId="b1" />);

    screen.getByRole('button', { name: 'Retry' }).click();
    expect(state.report.refetch).toHaveBeenCalled();
    expect(screen.getByText(/^Cost: /)).toBeInTheDocument();
    expect(screen.getByTestId('run-outcome')).toHaveTextContent(
      'Finished, but not everything is done'
    );
    expect(screen.getByText('FR: analysis partly done')).toBeInTheDocument();
    expect(screen.getByTestId('run-total')).toHaveTextContent('—');
  });

  it('отказ чтения самого запуска — плашка с «Retry» вместо сводки', () => {
    state.run = { data: undefined, isError: true, error: new Error('x'), refetch: vi.fn() };
    render(<RunOverview runId="r1" bookId="b1" />);

    screen.getByRole('button', { name: 'Retry' }).click();
    expect(state.run.refetch).toHaveBeenCalled();
    expect(screen.queryByTestId('run-outcome')).not.toBeInTheDocument();
  });

  it('запуск ещё читается — спиннер, а не пустое место', () => {
    state.run = { data: undefined, isError: false, error: null, refetch: vi.fn() };
    const { container } = render(<RunOverview runId="r1" bookId="b1" />);

    expect(screen.queryByTestId('run-outcome')).not.toBeInTheDocument();
    expect(container).not.toBeEmptyDOMElement();
  });

  it('идёт: «In progress», сколько языков переведено, резерв в полёте рядом с итогом', () => {
    const live = {
      ...run,
      operation: { ...run.operation, status: 'active' },
      languages: [
        ...run.languages,
        { ...run.languages[0], language: 'es', status: 'running', analysis: null },
      ],
    } as unknown as TranslationRun;
    state.run = { data: live, isError: false, error: null, refetch: vi.fn() };
    state.report = {
      data: { ...report, inFlight: { calls: 2, reservedUsd: '0.04' } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    render(<RunOverview runId="r1" bookId="b1" />);

    expect(screen.getByTestId('run-outcome')).toHaveTextContent('In progress');
    expect(screen.getByText(/1 of 2 translated/)).toBeInTheDocument();
    expect(screen.getByText('+ $0.04 in progress')).toBeInTheDocument();
    // Пометки модели на идущем запуске не подводятся.
    expect(screen.queryByText(/Model flags to review/)).not.toBeInTheDocument();
  });

  it('отчёт ещё читается — в итоге «…», а не прочерк отказа; закончившийся запуск отчёт не опрашивает', () => {
    state.report = {
      data: undefined,
      isError: false,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    };
    state.reportArgs = [];
    render(<RunOverview runId="r1" bookId="b1" />);

    expect(screen.getByTestId('run-total')).toHaveTextContent('…');
    expect(state.reportArgs.at(-1)).toEqual(['r1', false]);
  });

  it('идущий запуск опрашивает отчёт (live)', () => {
    state.run = {
      data: { ...run, operation: { ...run.operation, status: 'active' } },
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    state.reportArgs = [];
    render(<RunOverview runId="r1" bookId="b1" />);

    expect(state.reportArgs.at(-1)).toEqual(['r1', true]);
  });

  it('пауза — подсказка, где «Resume»', () => {
    state.run = {
      data: { ...run, operation: { ...run.operation, status: 'paused' } },
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    render(<RunOverview runId="r1" bookId="b1" />);

    expect(screen.getByTestId('run-outcome')).toHaveTextContent('Paused');
    expect(screen.getByText(/Resume or cancel it under “Details” below/)).toBeInTheDocument();
  });

  it('пауза при идущем запуске — подсказка, где «Resume», и при «In progress»', () => {
    state.run = {
      data: {
        ...run,
        operation: { ...run.operation, status: 'paused' },
        languages: [
          ...run.languages,
          {
            ...run.languages[0],
            language: 'es',
            status: 'done',
            analysis: {
              ...run.languages[0].analysis,
              status: 'building',
              operationStatus: 'active',
            },
          },
        ],
      },
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    render(<RunOverview runId="r1" bookId="b1" />);

    expect(screen.getByTestId('run-outcome')).toHaveTextContent('In progress');
    expect(screen.getByText('translation paused')).toBeInTheDocument();
    expect(screen.getByText(/Resume or cancel it under “Details” below/)).toBeInTheDocument();
  });
});
