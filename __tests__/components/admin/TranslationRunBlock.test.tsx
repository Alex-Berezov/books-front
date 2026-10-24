import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslationRunBlock } from '@/components/admin/translation-run/TranslationRunBlock';
import { ApiError } from '@/types/api';
import type { TranslationRun, TranslationSource } from '@/types/api-schema';

/**
 * F05-7: блок запуска на странице версии — какой запуск он показывает, отказы с «Retry»
 * и перезапуск после устаревшего досье. Хуки и тяжёлые части подменены.
 */

const hooks = vi.hoisted(() => ({
  current: {
    runs: [] as Array<{ id: string; operation?: { status: string } }>,
    error: null as unknown,
    refetch: vi.fn(),
  },
  runFailed: null as unknown,
  refetch: vi.fn(),
  source: { data: undefined as unknown, isFetching: false, isError: false, error: null as unknown },
  runCalls: [] as Array<string | null>,
  sourceEnabled: [] as boolean[],
  restart: null as null | (() => void),
  makeRun: null as null | ((id: string) => unknown),
}));

vi.mock('@/api/hooks', () => ({
  useVersionTranslationRuns: () => hooks.current,
  useTranslationRun: (id: string | null) => {
    hooks.runCalls.push(id);
    return hooks.runFailed
      ? { data: undefined, isError: true, error: hooks.runFailed, refetch: hooks.refetch }
      : { data: id && hooks.makeRun ? hooks.makeRun(id) : undefined, isError: false, error: null };
  },
  useTranslationSource: (_: string, enabled: boolean) => {
    hooks.sourceEnabled.push(enabled);
    return hooks.source;
  },
}));

// `next/dynamic` отдаёт заглушку по пути модуля: блок хода и окна — видно только, что нарисованы.
vi.mock('next/dynamic', () => ({
  default: (load: () => Promise<unknown>) => {
    const text = load.toString();
    const names = ['RunProgress', 'RunReportModal', 'StartRunModal'].filter((n) =>
      text.includes(n)
    );
    // Неузнанный путь модуля - падение здесь, а не тихо «не то окно».
    if (names.length !== 1) throw new Error(`dynamic(): unknown module in ${text}`);
    const name = names[0];
    const Stub = (props: { onRestart?: () => void; run?: { id: string } }) => {
      if (name === 'RunProgress') hooks.restart = props.onRestart ?? null;
      const suffix = props.run ? ` ${props.run.id}` : '';
      return <div role="region" aria-label={`stub ${name}${suffix}`} />;
    };
    return Stub;
  },
}));

const run = (id: string): TranslationRun => ({
  id,
  bookVersionId: 'v1',
  sourceLanguage: 'en',
  dossierId: null,
  stageModels: {},
  operation: {
    id: `op-${id}`,
    kind: 'translation_run',
    status: 'active',
    pauseReason: null,
    bookVersionId: 'v1',
    limitUsd: '10',
    reservedUsd: '0',
    spentUsd: '0',
    createdAt: '2026-10-24T00:00:00.000Z',
    updatedAt: '2026-10-24T00:00:00.000Z',
  },
  operations: [],
  languages: [],
  createdAt: '2026-10-24T00:00:00.000Z',
});
const source: TranslationSource = {
  canTranslate: true,
  reason: null,
  sourceVersionId: 'v1',
  sourceLanguage: 'en',
  originalLanguageRaw: 'English',
  originalLanguageMismatch: false,
  targets: [],
};
const refused = new ApiError({ message: 'Forbidden', statusCode: 403, error: 'Forbidden' });

const renderBlock = () => render(<TranslationRunBlock versionId="v1" bookId="b1" lang="en" />);

describe('Блок запуска перевода на странице версии (F05-7)', () => {
  beforeEach(() => {
    hooks.current = { runs: [{ id: 'r1' }], error: null, refetch: vi.fn() };
    hooks.runFailed = null;
    hooks.refetch = vi.fn();
    hooks.makeRun = run;
    hooks.source = { data: undefined, isFetching: false, isError: false, error: null };
    hooks.runCalls.length = 0;
    hooks.sourceEnabled.length = 0;
    hooks.restart = null;
  });

  it('запуска у версии нет — блока нет, ход не запрашивается', () => {
    hooks.current = { runs: [], error: null, refetch: vi.fn() };
    const { container } = renderBlock();

    expect(container).toBeEmptyDOMElement();
    expect(hooks.runCalls).toEqual([]);
  });

  it('несколько идущих запусков (по языку на запуск) — у каждого свой ход и свой блок', () => {
    hooks.current = { runs: [{ id: 'r-es' }, { id: 'r-fr' }], error: null, refetch: vi.fn() };
    renderBlock();

    expect(hooks.runCalls).toEqual(expect.arrayContaining(['r-es', 'r-fr']));
    expect(screen.getByRole('region', { name: 'stub RunProgress r-es' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'stub RunProgress r-fr' })).toBeInTheDocument();
  });

  it('отказ списка запусков — плашка с «Retry», уже видимые запуски не прячутся', () => {
    hooks.current = { runs: [{ id: 'r1' }], error: refused, refetch: vi.fn() };
    renderBlock();

    expect(screen.getByRole('alert')).toHaveTextContent('Forbidden');
    expect(screen.getByRole('region', { name: 'stub RunProgress r1' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(hooks.current.refetch).toHaveBeenCalled();
  });

  it('отказ хода — плашка с «Retry», которая перечитывает ход', () => {
    hooks.runFailed = refused;
    renderBlock();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(hooks.refetch).toHaveBeenCalled();
  });

  it('перезапуск: языки запрашиваются только после отмены; пока грузятся — спиннер, отказ — плашка', () => {
    const { rerender } = renderBlock();
    expect(hooks.sourceEnabled.at(-1)).toBe(false);

    hooks.source = { data: undefined, isFetching: true, isError: false, error: null };
    act(() => hooks.restart?.());
    rerender(<TranslationRunBlock versionId="v1" bookId="b1" lang="en" />);
    expect(hooks.sourceEnabled.at(-1)).toBe(true);
    expect(document.querySelector('.ant-spin')).not.toBeNull();

    hooks.source = { data: undefined, isFetching: false, isError: true, error: refused };
    rerender(<TranslationRunBlock versionId="v1" bookId="b1" lang="en" />);
    expect(
      screen.getByText(/The run is cancelled, but the start window cannot open/)
    ).toBeInTheDocument();

    hooks.source = { data: source, isFetching: false, isError: false, error: null };
    rerender(<TranslationRunBlock versionId="v1" bookId="b1" lang="en" />);
    expect(screen.getByRole('region', { name: 'stub StartRunModal' })).toBeInTheDocument();
  });
});
