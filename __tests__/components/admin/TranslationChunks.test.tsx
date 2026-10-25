import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslationChunks } from '@/components/admin/translation-chunks/TranslationChunks';
import type {
  TranslationChunk,
  TranslationChunks as Chunks,
  TranslationRun,
  TranslationRunReport,
} from '@/types/api-schema';

/**
 * F05-7v-b: экран кусков — главы из отчёта плюс глава хода, глава по умолчанию после отчёта,
 * фильтр «только флаги» при кнопках у любого куска, язык из адреса только из запуска,
 * предупреждение у черновика не-черновика или непрочитанного, блокировка на идущем запуске.
 */

const hooks = vi.hoisted(() => ({
  run: undefined as unknown,
  report: undefined as unknown,
  reportError: false,
  chunks: undefined as unknown,
  draft: { data: { status: 'draft' } as unknown, isError: false },
  chunkCalls: [] as Array<{ language: string; chapter: number | null; live: boolean }>,
  reportLive: [] as boolean[],
  runError: null as unknown,
  chunksError: null as unknown,
}));

const mutation = () => ({
  mutate: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  error: null,
  data: undefined,
});

vi.mock('@/api/hooks', () => ({
  useTranslationRun: () => ({
    data: hooks.run,
    isError: hooks.runError !== null,
    error: hooks.runError,
  }),
  useTranslationRunReport: (_id: string, live: boolean) => {
    hooks.reportLive.push(live);
    return {
      data: hooks.reportError ? undefined : hooks.report,
      isError: hooks.reportError,
      error: hooks.reportError ? new Error('boom') : null,
    };
  },
  useTranslationChunks: (_run: string, language: string, chapter: number | null, live: boolean) => {
    hooks.chunkCalls.push({ language, chapter, live });
    return {
      data: chapter === null || hooks.chunksError ? undefined : hooks.chunks,
      isLoading: false,
      isError: hooks.chunksError !== null,
      error: hooks.chunksError,
    };
  },
  useTranslationChunkActions: () => ({
    retry: mutation(),
    edit: mutation(),
    resumeRetry: mutation(),
    cancelRetry: mutation(),
  }),
  useBookVersion: () => hooks.draft,
  useLlmModels: () => ({ data: { items: [] }, isLoading: false }),
  useVersionDossier: () => ({ data: undefined, isLoading: false, isError: false }),
  useDossierGlossary: () => ({ data: undefined, isLoading: false, isError: false }),
}));

const chunkOf = (id: string, over: Partial<TranslationChunk> = {}): TranslationChunk => ({
  id,
  chunkIndex: id === 'a' ? 0 : 1,
  firstBlock: 1,
  lastBlock: 1,
  status: 'done',
  flagReason: null,
  model: 'a/model',
  costUsd: '0.01',
  attempts: 1,
  remarks: [],
  editedAt: null,
  retry: null,
  blocks: [{ n: 1, source: `source ${id}`, translation: `translation ${id}` }],
  ...over,
});

const runOf = (
  status: 'active' | 'paused' = 'paused',
  esStatus: 'running' | 'done' = 'running'
): TranslationRun =>
  ({
    id: 'r1',
    bookVersionId: 'v1',
    sourceLanguage: 'en',
    dossierId: 'd1',
    stageModels: {},
    operation: { status },
    operations: [],
    languages: [
      {
        language: 'es',
        status: esStatus,
        chapterNumber: 3,
        draftVersionId: 'draft-es',
        glossaryId: 'g1',
      },
      {
        language: 'fr',
        status: 'running',
        chapterNumber: 1,
        draftVersionId: null,
        glossaryId: null,
      },
    ],
    createdAt: '2026-10-25T00:00:00.000Z',
  }) as unknown as TranslationRun;

const reportOf = (): TranslationRunReport =>
  ({
    languages: [
      {
        language: 'es',
        chapters: [
          { number: 1, flagReason: null, findings: [] },
          { number: 2, flagReason: 'SEAM_BROKEN', findings: [] },
        ],
      },
    ],
  }) as unknown as TranslationRunReport;

const chunksOf = (): Chunks => ({
  runId: 'r1',
  language: 'es',
  chapterNumber: 2,
  sourceChanged: false,
  chapter: {
    status: 'flagged',
    flagReason: 'SEAM_BROKEN',
    rewriteRefusal: null,
    chapterId: 'ch2',
    findings: [{ code: 'GLOSSARY_SOURCE_FORM', form: 'Ana', target: 'Anita', stale: true }],
  },
  chunks: [chunkOf('a'), chunkOf('b', { status: 'flagged', flagReason: 'SEMANTIC_FAIL' })],
});

beforeEach(() => {
  hooks.run = runOf();
  hooks.report = reportOf();
  hooks.reportError = false;
  hooks.chunks = chunksOf();
  hooks.draft = { data: { status: 'draft' }, isError: false };
  hooks.chunkCalls.length = 0;
  hooks.reportLive.length = 0;
  hooks.runError = null;
  hooks.chunksError = null;
});

const screenOf = (language: string | null = 'es') => (
  <TranslationChunks lang="en" versionId="v1" runId="r1" bookId="b1" language={language} />
);
const renderScreen = (language: string | null = 'es') => render(screenOf(language));

const lastCall = () => hooks.chunkCalls.at(-1);

describe('Экран кусков запуска (F05-7v-b)', () => {
  it('по умолчанию — первая флагнутая глава; в списке есть несобранная глава хода', () => {
    renderScreen();
    expect(lastCall()?.chapter).toBe(2);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Chapter' }));
    // antd рисует выбранное значение и пункт списка отдельно: текст встречается больше одного раза.
    expect(screen.getAllByText('Chapter 3 (not assembled)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Chapter 2 (flagged)').length).toBeGreaterThan(0);
  });

  it('до отчёта глава не выбирается; приход и перечитывание отчёта не уводят с главы', () => {
    hooks.report = undefined;
    const { rerender } = renderScreen();
    expect(lastCall()?.chapter).toBeNull();
    hooks.report = reportOf();
    rerender(screenOf());
    expect(lastCall()?.chapter).toBe(2);
    // Отчёт перечитан, флаг переехал на главу 1: открытая глава остаётся.
    hooks.report = {
      languages: [
        { language: 'es', chapters: [{ number: 1, flagReason: 'SEAM_BROKEN', findings: [] }] },
      ],
    };
    rerender(screenOf());
    expect(lastCall()?.chapter).toBe(2);
  });

  it('отказ отчёта — глава хода всё равно открывается', () => {
    hooks.reportError = true;
    renderScreen();
    expect(lastCall()?.chapter).toBe(3);
  });

  it('отказ чтения кусков — подписью кода на экране', async () => {
    const { ApiError } = await import('@/types/api');
    hooks.chunksError = new ApiError({
      message: 'raw',
      statusCode: 409,
      error: 'Conflict',
      data: { code: 'RUN_ACTIVE' },
    });
    renderScreen();
    expect(screen.getByText(/pause the run first/)).toBeInTheDocument();
  });

  it('смена языка — своя глава и фильтр: выбор прошлого языка не переезжает', () => {
    hooks.report = {
      languages: [
        { language: 'es', chapters: [{ number: 2, flagReason: 'SEAM_BROKEN', findings: [] }] },
        { language: 'fr', chapters: [{ number: 5, flagReason: null, findings: [] }] },
      ],
    };
    renderScreen();
    expect(lastCall()).toMatchObject({ language: 'es', chapter: 2 });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Language' }));
    fireEvent.click(screen.getAllByText('FR').at(-1) as HTMLElement);
    expect(lastCall()).toMatchObject({ language: 'fr', chapter: 1 });
  });

  it('язык не из запуска — первый язык запуска', () => {
    renderScreen('xx');
    expect(lastCall()?.language).toBe('es');
  });

  it('«только флаги» скрывает кусок без флага; кнопки остаются у любого куска', () => {
    renderScreen();
    expect(screen.getAllByRole('button', { name: 'Translate again' })).toHaveLength(2);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Only flagged pieces' }));
    expect(screen.queryByText('source a')).not.toBeInTheDocument();
    expect(screen.getByText('source b')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Translate again' })).toHaveLength(1);
  });

  it('глава без кусков — так и сказано', () => {
    hooks.chunks = { ...chunksOf(), chunks: [] };
    renderScreen();
    expect(screen.getByText('The chapter has no pieces yet.')).toBeInTheDocument();
  });

  it('находка главы до правки — приглушена, с формой глоссария, как в отчёте', () => {
    renderScreen();
    const stale = screen.getByText(
      /a name stayed in the source spelling — Ana → Anita — before a retry or edit/
    );
    expect(stale.className).toMatch(/stale/);
  });

  it.each([
    ['опубликован', { data: { status: 'published' }, isError: false }],
    ['не прочитан (удалён)', { data: undefined, isError: true }],
  ])('черновик %s — предупреждение в окне повтора', (_, draft) => {
    hooks.draft = draft;
    renderScreen();
    fireEvent.click(screen.getAllByRole('button', { name: 'Translate again' })[0]);
    expect(
      screen.getByText(/the retry is paid, but the chapter may not be rewritten/)
    ).toBeInTheDocument();
  });

  it('черновик — без предупреждения', () => {
    renderScreen();
    fireEvent.click(screen.getAllByRole('button', { name: 'Translate again' })[0]);
    expect(screen.queryByText(/the retry is paid/)).not.toBeInTheDocument();
  });

  it('запуск идёт — кнопки неактивны, куски и отчёт опрашиваются', () => {
    hooks.run = runOf('active');
    renderScreen();
    for (const b of screen.getAllByRole('button', { name: 'Translate again' })) {
      expect(b).toBeDisabled();
    }
    expect(lastCall()?.live).toBe(true);
    expect(hooks.reportLive.at(-1)).toBe(true);
  });

  it('язык закончен, а запуск ещё идёт другим языком — кнопки тоже неактивны (RUN_ACTIVE)', () => {
    hooks.run = runOf('active', 'done');
    renderScreen();
    for (const b of screen.getAllByRole('button', { name: 'Translate again' })) {
      expect(b).toBeDisabled();
    }
  });

  it('запуск на паузе — отчёт не опрашивается', () => {
    renderScreen();
    expect(hooks.reportLive.at(-1)).toBe(false);
  });

  it('у куска главы идёт повтор — кнопки остальных кусков неактивны', () => {
    hooks.chunks = {
      ...chunksOf(),
      chunks: [
        chunkOf('a', {
          retry: {
            operationId: 'op1',
            status: 'pending',
            requestedModel: null,
            model: null,
            reason: null,
            reasonModels: [],
            costUsd: '0',
            operationStatus: 'active',
            pauseReason: null,
            spentUsd: '0',
            limitUsd: '1',
          },
        }),
        chunkOf('b'),
      ],
    };
    renderScreen();
    for (const b of screen.getAllByRole('button', { name: 'Edit' })) expect(b).toBeDisabled();
  });

  it('кусок, с которым работали, под фильтром не пропадает', () => {
    renderScreen();
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Only flagged pieces' }));
    expect(screen.getByText('source a')).toBeInTheDocument();
  });

  it('отказ перечитывания хода — плашка поверх экрана, экран не стирается', () => {
    hooks.runError = new Error('boom');
    renderScreen();
    expect(screen.getByRole('heading', { name: 'Original | translation' })).toBeInTheDocument();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    expect(screen.getByText('source a')).toBeInTheDocument();
  });

  it('глава исходника правлена после нарезки — предупреждение', () => {
    hooks.chunks = { ...chunksOf(), sourceChanged: true };
    renderScreen();
    expect(screen.getByText(/blocks may not match the source/)).toBeInTheDocument();
  });

  it('главы ещё нет — «не собрана»; без флагов под фильтром — так и сказано', () => {
    hooks.chunks = { ...chunksOf(), chapter: null, chunks: [chunkOf('a')] };
    renderScreen();
    expect(screen.getByText('The chapter is not assembled yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Only flagged pieces' }));
    expect(screen.getByText('No flagged pieces in this chapter.')).toBeInTheDocument();
  });

  it('отказ перезаписи главы — подписью на экране кусков', () => {
    hooks.chunks = {
      ...chunksOf(),
      chapter: { ...chunksOf().chapter, rewriteRefusal: 'CHAPTER_EDITED_MANUALLY' },
    };
    renderScreen();
    expect(
      screen.getByText(
        'The last retry or edit did not rewrite the chapter: the chapter of the draft was edited by hand after it was written.'
      )
    ).toBeInTheDocument();
  });
});
