import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RunProgress } from '@/components/admin/translation-run/RunProgress';
import type { LlmOperation, TranslationRun, TranslationRunLanguage } from '@/types/api-schema';

/**
 * F05-7: блок запуска на странице версии. Мутации подменены: проверяется, какое действие блок
 * даёт на каждой причине паузы и что уходит в «продолжить».
 */

const actions = vi.hoisted(() => {
  const mutation = () => ({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    error: null,
    variables: undefined,
  });
  return {
    pause: mutation(),
    resume: mutation(),
    cancel: mutation(),
    resumeOperation: mutation(),
    cancelOperation: mutation(),
  };
});

vi.mock('@/api/hooks', () => ({
  useTranslationRunActions: () => actions,
  useLlmModels: () => ({
    data: {
      items: [{ id: 'z/other', name: 'Other', inputPerMTokUsd: '1', outputPerMTokUsd: '1' }],
    },
    isLoading: false,
    isError: false,
  }),
}));

const operation = (over: Partial<LlmOperation> = {}): LlmOperation => ({
  id: 'op-run',
  kind: 'translation_run',
  status: 'active',
  pauseReason: null,
  bookVersionId: 'v1',
  limitUsd: '10.00000000',
  reservedUsd: '0.00000000',
  spentUsd: '1.00000000',
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
  ...over,
});

const language = (over: Partial<TranslationRunLanguage> = {}): TranslationRunLanguage => ({
  language: 'es',
  status: 'running',
  stage: 'translate',
  reason: null,
  reasonText: null,
  reasonModels: [],
  reasonUsd: null,
  chapterNumber: 2,
  chapterPosition: 2,
  chaptersTotal: 3,
  chunksDone: 1,
  chunksTotal: 2,
  flaggedChunks: 1,
  flaggedChapters: 0,
  glossaryId: 'g1',
  blockedByOperationId: null,
  draftVersionId: null,
  ...over,
});

const run = (over: Partial<TranslationRun> = {}): TranslationRun => ({
  id: 'r1',
  bookVersionId: 'v1',
  sourceLanguage: 'en',
  dossierId: 'd1',
  stageModels: {},
  operation: operation(),
  operations: [],
  languages: [language()],
  createdAt: '2026-10-24T00:00:00.000Z',
  ...over,
});

const paused = (pauseReason: LlmOperation['pauseReason'], over: Partial<TranslationRun> = {}) =>
  run({ operation: operation({ status: 'paused', pauseReason }), ...over });

const onRestart = vi.fn();
const renderBlock = (value: TranslationRun) =>
  render(
    <RunProgress run={value} bookId="b1" lang="en" onReport={vi.fn()} onRestart={onRestart} />
  );

const confirm = async (name: string) =>
  fireEvent.click(await screen.findByRole('button', { name }));

describe('Блок запуска перевода (F05-7)', () => {
  beforeEach(() => {
    for (const m of Object.values(actions)) m.mutate.mockClear();
    onRestart.mockClear();
  });

  it('идёт: глава N из M, куски, флаги, потрачено из лимита; пауза шлёт паузу', () => {
    renderBlock(run());

    expect(screen.getByText('chapter 2 of 3, pieces 1/2')).toBeInTheDocument();
    expect(screen.getByText('1 / 0')).toBeInTheDocument();
    expect(screen.getByText('Spent $1 of $10')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(actions.pause.mutate).toHaveBeenCalled();
  });

  it('F05-7v: ссылка на куски языка — с запуском, книгой и языком; без кусков — прочерк', () => {
    renderBlock(run({ languages: [language(), language({ language: 'fr', chunksTotal: 0 })] }));

    const links = screen.getAllByRole('link', { name: 'Original | translation' });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute(
      'href',
      '/admin/en/books/versions/v1/translation-chunks?run=r1&book=b1&language=es'
    );
  });

  it('F05-7v: вид операции повтора куска подписан своим словом', () => {
    renderBlock(
      run({
        operations: [operation({ id: 'op-retry', kind: 'translation_retry', status: 'done' })],
      })
    );

    expect(screen.getByText(/Piece retry:/)).toBeInTheDocument();
  });

  it('смена состояния запуска снимает плашки прежних отказов', () => {
    const { rerender } = renderBlock(run());
    for (const m of Object.values(actions)) m.reset.mockClear();

    rerender(
      <RunProgress
        run={paused(null)}
        bookId="b1"
        lang="en"
        onReport={vi.fn()}
        onRestart={onRestart}
      />
    );

    for (const m of Object.values(actions)) expect(m.reset).toHaveBeenCalled();
  });

  it('идущий запрос кнопки при смене состояния не сбрасывается: отказ и onSuccess не теряются', () => {
    const { rerender } = renderBlock(run());
    for (const m of Object.values(actions)) m.reset.mockClear();
    (actions.cancel as { isPending: boolean }).isPending = true;

    rerender(
      <RunProgress
        run={paused(null)}
        bookId="b1"
        lang="en"
        onReport={vi.fn()}
        onRestart={onRestart}
      />
    );
    (actions.cancel as { isPending: boolean }).isPending = false;

    expect(actions.cancel.reset).not.toHaveBeenCalled();
    expect(actions.pause.reset).toHaveBeenCalled();
  });

  it('отмена — только после подтверждения', async () => {
    renderBlock(run());

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(actions.cancel.mutate).not.toHaveBeenCalled();
    await confirm('Cancel the run');
    expect(actions.cancel.mutate).toHaveBeenCalled();
  });

  it('лимита запуска не хватает досье или глоссарию до трат — подпись с суммой и поле лимита', () => {
    renderBlock(
      paused('LIMIT_REACHED', {
        languages: [
          language({ stage: 'dossier', reason: 'DOSSIER_LIMIT_TOO_LOW', reasonUsd: '0.05220000' }),
        ],
      })
    );

    expect(
      screen.getByText(/lower than the dossier or glossary needs.*at least \$0\.0522/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/The run limit is reached/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('New run limit'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(actions.resume.mutate).toHaveBeenCalledWith({ limitUsd: '5' });
  });

  it('новая пауза — пустое поле: лимит, введённый на прошлой, не уходит', () => {
    const first = paused('LIMIT_REACHED');
    const { rerender } = renderBlock(first);
    fireEvent.change(screen.getByLabelText('New run limit'), { target: { value: '25' } });

    rerender(
      <RunProgress
        run={run({
          operation: operation({
            status: 'paused',
            pauseReason: 'LIMIT_REACHED',
            updatedAt: '2026-10-24T01:00:00.000Z',
          }),
        })}
        bookId="b1"
        lang="en"
        onReport={vi.fn()}
        onRestart={onRestart}
      />
    );

    expect(screen.getByLabelText('New run limit')).toHaveValue('');
  });

  it('операция досье на своём LIMIT_REACHED — «продолжить» с новым лимитом этой операции', () => {
    renderBlock(
      paused('DOSSIER_PAUSED', {
        operations: [
          operation({
            id: 'op-d',
            kind: 'dossier',
            status: 'paused',
            pauseReason: 'LIMIT_REACHED',
          }),
        ],
        languages: [language({ stage: 'dossier', blockedByOperationId: 'op-d' })],
      })
    );

    expect(
      screen.queryByRole('button', { name: 'Resume the dossier or glossary' })
    ).not.toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Dossier and glossary operations' });
    fireEvent.change(within(list).getByLabelText('New limit of operation op-d'), {
      target: { value: '2' },
    });
    fireEvent.click(within(list).getByRole('button', { name: 'Resume' }));
    expect(actions.resumeOperation.mutate).toHaveBeenCalledWith({ id: 'op-d', limitUsd: '2' });
  });

  it('досье, которого ждал язык, отменили или оно упало — не «продолжить», а новый запуск', async () => {
    renderBlock(paused('STEP_FAILED', { languages: [language({ reason: 'STEP_FAILED' })] }));

    expect(screen.getByText(/was cancelled or failed: this run cannot go on/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resume' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rebuild and start again' }));
    const buttons = await screen.findAllByRole('button', { name: 'Rebuild and start again' });
    fireEvent.click(buttons[buttons.length - 1]);
    expect(actions.cancel.mutate).toHaveBeenCalledWith(undefined, { onSuccess: onRestart });
  });

  it('операция досье на потолке или без провайдера — ссылка на LLM settings в её строке', () => {
    renderBlock(
      paused('DOSSIER_PAUSED', {
        operations: [
          operation({
            id: 'op-d',
            kind: 'dossier',
            status: 'paused',
            pauseReason: 'CEILING_REACHED',
          }),
        ],
        languages: [language({ blockedByOperationId: 'op-d' })],
      })
    );

    const list = screen.getByRole('list', { name: 'Dossier and glossary operations' });
    expect(within(list).getByRole('link', { name: 'LLM settings' })).toHaveAttribute(
      'href',
      '/admin/en/llm-settings'
    );
  });

  it('отказ кнопки досье подписан как отказ досье, а не запуска', () => {
    (actions.resumeOperation as { error: unknown }).error = new Error('x');
    renderBlock(run());
    (actions.resumeOperation as { error: unknown }).error = null;

    expect(screen.getByRole('alert')).toHaveTextContent('Dossier or glossary: The request failed');
  });

  it('пауза кнопкой — «продолжить» без тела', () => {
    renderBlock(paused(null));

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(actions.resume.mutate).toHaveBeenCalledWith({});
  });

  it('LIMIT_REACHED — поле нового лимита, «продолжить» шлёт limitUsd', () => {
    renderBlock(paused('LIMIT_REACHED'));

    expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('New run limit'), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(actions.resume.mutate).toHaveBeenCalledWith({ limitUsd: '25' });
  });

  it('CEILING_REACHED — ссылка на LLM settings, поля лимита нет', () => {
    renderBlock(paused('CEILING_REACHED'));

    expect(screen.queryByLabelText('New run limit')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'LLM settings' })).toHaveAttribute(
      'href',
      '/admin/en/llm-settings'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(actions.resume.mutate).toHaveBeenCalledWith({});
  });

  it('без провайдера на сверке смысла — модели отказа видны, «продолжить» шлёт модель этапа', async () => {
    renderBlock(
      paused('NO_COMPLIANT_PROVIDER', {
        languages: [
          language({ reason: 'CHECK_NO_COMPLIANT_PROVIDER', reasonModels: ['a/x', 'b/y'] }),
        ],
      })
    );

    expect(screen.getByText(/meaning check stage: a\/x, b\/y/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'LLM settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Model for the stage' }));
    fireEvent.click(await screen.findByText(/Other \(z\/other\)/));
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(actions.resume.mutate).toHaveBeenCalledWith({
      stageModels: { check_semantic: 'z/other' },
    });
  });

  it('ждёт досье — причина операции досье и «продолжить досье» шлёт её «продолжить»', () => {
    const builder = operation({
      id: 'op-dossier',
      kind: 'dossier',
      status: 'paused',
      pauseReason: 'CEILING_REACHED',
      spentUsd: '0.2',
      limitUsd: '0.5',
    });
    renderBlock(
      paused('DOSSIER_PAUSED', {
        operations: [builder],
        languages: [language({ stage: 'dossier', blockedByOperationId: 'op-dossier' })],
      })
    );

    expect(
      screen.getByText(
        /Waiting for the dossier or glossary: paused: the spending ceiling is reached/
      )
    ).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Dossier and glossary operations' });
    expect(within(list).getByText(/spent \$0\.2 of \$0\.5/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Resume the dossier or glossary' }));
    expect(actions.resumeOperation.mutate).toHaveBeenCalledWith({ id: 'op-dossier' });
    expect(actions.resume.mutate).not.toHaveBeenCalled();
  });

  it('DOSSIER_STALE — «перестроить и запустить заново» отменяет запуск и открывает новый', async () => {
    renderBlock(paused('DOSSIER_STALE'));

    expect(screen.queryByRole('button', { name: 'Resume' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rebuild and start again' }));
    const buttons = await screen.findAllByRole('button', { name: 'Rebuild and start again' });
    fireEvent.click(buttons[buttons.length - 1]);
    expect(actions.cancel.mutate).toHaveBeenCalledWith(undefined, { onSuccess: onRestart });
  });

  it('INSUFFICIENT_FUNDS и STEP_FAILED — свои подписи', () => {
    const { unmount } = renderBlock(paused('INSUFFICIENT_FUNDS'));
    expect(screen.getByText(/The OpenRouter balance is empty: top it up/)).toBeInTheDocument();
    unmount();

    renderBlock(paused('STEP_FAILED', { languages: [language({ reason: 'LLM_PROVIDER_ERROR' })] }));
    expect(
      screen.getByText(/A step failed: the model provider refused the request/)
    ).toBeInTheDocument();
  });

  it('упавший язык: VERSION_EXISTS и CREATE_REJECTED своими подписями; ссылка на черновик', () => {
    renderBlock(
      run({
        operation: operation({ status: 'done' }),
        languages: [
          language({ language: 'es', status: 'failed', stage: 'failed', reason: 'VERSION_EXISTS' }),
          language({
            language: 'fr',
            status: 'failed',
            stage: 'failed',
            reason: 'CREATE_REJECTED',
            reasonText: 'Language removed from intake',
          }),
          language({ language: 'ru', status: 'done', stage: 'done', draftVersionId: 'draft-ru' }),
        ],
      })
    );

    expect(screen.getByText('A version in this language already exists.')).toBeInTheDocument();
    expect(
      screen.getByText('The draft version was refused: Language removed from intake')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open draft' })).toHaveAttribute(
      'href',
      '/admin/en/books/versions/draft-ru'
    );
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument();
  });
});
