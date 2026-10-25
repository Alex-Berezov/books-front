import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChunkCard } from '@/components/admin/translation-chunks/TranslationChunks/ChunkCard';
import { ApiError } from '@/types/api';
import type { TranslationChunk, TranslationChunkRetry } from '@/types/api-schema';

/**
 * F05-7v-b: кусок «оригинал | перевод» — блоки по номеру, кнопки у любого куска и их
 * блокировка на идущем запуске, «правлено руками», попытка повтора (идёт, пауза, итог),
 * предупреждения до трат, итог правки. Мутации — свои у карточки (`useTranslationChunkActions`).
 */

const mutation = () => ({
  mutate: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  error: null as unknown,
  data: undefined as unknown,
});

const hooks = vi.hoisted(() => ({
  actions: null as unknown as Record<
    'retry' | 'edit' | 'resumeRetry' | 'cancelRetry',
    {
      mutate: ReturnType<typeof vi.fn>;
      reset: ReturnType<typeof vi.fn>;
      isPending: boolean;
      error: unknown;
      data: unknown;
    }
  >,
  runIds: [] as string[],
  actionArgs: [] as unknown[][],
  modelsError: null as unknown,
}));

vi.mock('@/api/hooks', () => ({
  useLlmModels: () => ({
    data: hooks.modelsError
      ? undefined
      : { items: [{ id: 'x/other', name: 'Other', inputPerMTokUsd: '1', outputPerMTokUsd: '1' }] },
    isLoading: false,
    isError: hooks.modelsError !== null,
    error: hooks.modelsError,
  }),
  useTranslationChunkActions: (...args: unknown[]) => {
    hooks.runIds.push(args[0] as string);
    hooks.actionArgs.push(args);
    return hooks.actions;
  },
}));

const chunkOf = (over: Partial<TranslationChunk> = {}): TranslationChunk => ({
  id: 'c1',
  chunkIndex: 0,
  firstBlock: 4,
  lastBlock: 5,
  status: 'done',
  flagReason: null,
  model: 'a/model',
  costUsd: '0.01',
  attempts: 1,
  remarks: [],
  editedAt: null,
  retry: null,
  blocks: [
    { n: 4, source: 'source four', translation: 'translation four' },
    { n: 5, source: 'source five', translation: null },
  ],
  ...over,
});

const pausedRetry: TranslationChunkRetry = {
  operationId: 'op-retry',
  status: 'checked',
  requestedModel: 'b/model',
  model: 'b/model',
  reason: null,
  reasonModels: [],
  costUsd: '0.2',
  operationStatus: 'paused',
  pauseReason: 'INSUFFICIENT_FUNDS',
  spentUsd: '0.2',
  limitUsd: '0.3',
};

beforeEach(() => {
  hooks.actions = {
    retry: mutation(),
    edit: mutation(),
    resumeRetry: mutation(),
    cancelRetry: mutation(),
  };
  hooks.runIds.length = 0;
  hooks.actionArgs.length = 0;
  hooks.modelsError = null;
  onTouch.mockClear();
});

const onTouch = vi.fn();

const cardOf = (
  chunk: TranslationChunk,
  props: Partial<{ notDraft: boolean; runActive: boolean; pairBusy: boolean }> = {}
) => (
  <ChunkCard
    chunk={chunk}
    runId="r1"
    lang="en"
    draftVersionId="draft-es"
    chapterId="ch1"
    notDraft={props.notDraft ?? false}
    runActive={props.runActive ?? false}
    pairBusy={props.pairBusy ?? false}
    onTouch={onTouch}
  />
);
const renderCard = (...args: Parameters<typeof cardOf>) => render(cardOf(...args));

const blockTexts = (n: number) =>
  Array.from(document.querySelectorAll(`[data-block="${n}"]`)).map((el) => el.textContent);

const conflict = (code: string, message: unknown = 'raw') =>
  new ApiError({ message: 'raw', statusCode: 409, error: 'Conflict', data: { code, message } });

describe('ChunkCard', () => {
  it('исходник и перевод стоят в одной строке по номеру блока; без перевода — «Not translated»', () => {
    renderCard(chunkOf());
    expect(blockTexts(4)).toEqual(['4source four', 'translation four']);
    expect(blockTexts(5)).toEqual(['5source five', 'Not translated']);
  });

  it('мутации — свои у карточки, по её запуску, черновику и главе', () => {
    renderCard(chunkOf());
    expect(hooks.actionArgs.at(-1)).toEqual(['r1', 'draft-es', 'ch1']);
  });

  it('у куска главы идёт повтор — кнопки неактивны с подсказкой', () => {
    renderCard(chunkOf(), { pairBusy: true });
    expect(screen.getByRole('button', { name: 'Translate again' })).toBeDisabled();
    expect(screen.getByText(/Another piece of this language is being retried/)).toBeInTheDocument();
  });

  it('открытие формы отмечает кусок: под фильтром он не пропадёт', () => {
    renderCard(chunkOf());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onTouch).toHaveBeenCalledTimes(1);
  });

  it('кнопки повтора и правки — у куска без флага', () => {
    renderCard(chunkOf());
    expect(screen.getByRole('button', { name: 'Translate again' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeEnabled();
  });

  it('запуск переводит язык — кнопки неактивны с подсказкой', () => {
    renderCard(chunkOf(), { runActive: true });
    expect(screen.getByRole('button', { name: 'Translate again' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
    expect(screen.getByText('Pause the run to retry or edit a piece.')).toBeInTheDocument();
  });

  it('правлено руками: пометка, модель и «почему» — о тексте до правки', () => {
    renderCard(chunkOf({ editedAt: '2026-10-25T10:00:00Z', remarks: ['meaning drift'] }));
    expect(screen.getByText('Edited by hand')).toBeInTheDocument();
    expect(screen.getByText(/before the edit by hand/)).toBeInTheDocument();
    expect(screen.getByText(/about the text before the edit/)).toBeInTheDocument();
  });

  it('повтор: лимит обязателен, пустая модель не уходит, один вызов', () => {
    renderCard(chunkOf());
    fireEvent.click(screen.getByRole('button', { name: 'Translate again' }));
    const start = screen.getByRole('button', { name: 'Start the retry' });
    expect(start).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Limit, $'), { target: { value: '0.5' } });
    fireEvent.click(start);
    expect(hooks.actions.retry.mutate).toHaveBeenCalledTimes(1);
    expect(hooks.actions.retry.mutate).toHaveBeenCalledWith(
      { chunkId: 'c1', data: { limitUsd: '0.5' } },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it('повтор другой моделью — модель в теле', () => {
    renderCard(chunkOf());
    fireEvent.click(screen.getByRole('button', { name: 'Translate again' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Model of the retry' }));
    fireEvent.click(screen.getAllByText(/Other/).at(-1) as HTMLElement);
    fireEvent.change(screen.getByLabelText('Limit, $'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start the retry' }));
    expect(hooks.actions.retry.mutate).toHaveBeenCalledTimes(1);
    expect(hooks.actions.retry.mutate).toHaveBeenCalledWith(
      { chunkId: 'c1', data: { model: 'x/other', limitUsd: '1' } },
      expect.anything()
    );
  });

  it('открытие формы снимает отказ и итог прошлого раза', () => {
    renderCard(chunkOf());
    fireEvent.click(screen.getByRole('button', { name: 'Translate again' }));
    expect(hooks.actions.retry.reset).toHaveBeenCalled();
    expect(hooks.actions.edit.reset).toHaveBeenCalled();
  });

  it('черновик не черновик или не прочитан — предупреждение до кнопки повтора, кнопка активна', () => {
    renderCard(chunkOf(), { notDraft: true });
    fireEvent.click(screen.getByRole('button', { name: 'Translate again' }));
    expect(
      screen.getByText(/the retry is paid, but the chapter may not be rewritten/)
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Limit, $'), { target: { value: '1' } });
    expect(screen.getByRole('button', { name: 'Start the retry' })).toBeEnabled();
  });

  it('новый повтор при попытке на паузе — только через подтверждение с потраченным', async () => {
    renderCard(chunkOf({ retry: pausedRetry }));
    fireEvent.click(screen.getByRole('button', { name: 'Translate again' }));
    fireEvent.change(screen.getByLabelText('Limit, $'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start the retry' }));
    expect(hooks.actions.retry.mutate).not.toHaveBeenCalled();
    expect(await screen.findByText(/its spent \$0\.2 is not returned/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go on' }));
    expect(hooks.actions.retry.mutate).toHaveBeenCalledTimes(1);
  });

  it('нулевой лимит повтора не принимается', () => {
    renderCard(chunkOf());
    fireEvent.click(screen.getByRole('button', { name: 'Translate again' }));
    fireEvent.change(screen.getByLabelText('Limit, $'), { target: { value: '0' } });
    expect(screen.getByRole('button', { name: 'Start the retry' })).toBeDisabled();
  });

  it('отказ повтора — подписью кода', () => {
    hooks.actions.retry.error = conflict('RUN_ACTIVE');
    renderCard(chunkOf());
    fireEvent.click(screen.getByRole('button', { name: 'Translate again' }));
    expect(screen.getByText(/pause the run first/)).toBeInTheDocument();
  });

  it('идущий повтор: шаг словами, кнопки неактивны', () => {
    renderCard(
      chunkOf({ retry: { ...pausedRetry, status: 'pending', operationStatus: 'active' } })
    );
    expect(screen.getByText(/Retry in progress: waiting for the model/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Translate again' })).toBeDisabled();
  });

  it('операция попытки закончилась без итога — кнопки не заблокированы навсегда', () => {
    renderCard(chunkOf({ retry: { ...pausedRetry, operationStatus: 'cancelled' } }));
    expect(screen.getByText(/The retry stopped without a result/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Translate again' })).toBeEnabled();
  });

  it('повтор на паузе: «продолжить» зовёт свою операцию', () => {
    renderCard(chunkOf({ retry: pausedRetry }));
    const retry = screen.getByLabelText('Retry');
    expect(within(retry).getByText(/The retry is paused/)).toBeInTheDocument();
    expect(within(retry).getByText(/the OpenRouter balance is empty/)).toBeInTheDocument();
    fireEvent.click(within(retry).getByRole('button', { name: 'Resume' }));
    expect(hooks.actions.resumeRetry.mutate).toHaveBeenCalledTimes(1);
    expect(hooks.actions.resumeRetry.mutate).toHaveBeenCalledWith({ id: 'op-retry' });
  });

  it('повтор на паузе: «отменить» — только после подтверждения', async () => {
    renderCard(chunkOf({ retry: pausedRetry }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(hooks.actions.cancelRetry.mutate).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel the retry' }));
    expect(hooks.actions.cancelRetry.mutate).toHaveBeenCalledTimes(1);
    expect(hooks.actions.cancelRetry.mutate).toHaveBeenCalledWith('op-retry');
  });

  it('повтор на паузе с лимитом — «продолжить» только с новым лимитом', () => {
    renderCard(chunkOf({ retry: { ...pausedRetry, pauseReason: 'LIMIT_REACHED' } }));
    fireEvent.change(screen.getByLabelText('New limit of the retry'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(hooks.actions.resumeRetry.mutate).toHaveBeenCalledWith({
      id: 'op-retry',
      limitUsd: '2',
    });
  });

  it('пауза без провайдера на переводе — подсказка: другая модель или настройки', () => {
    renderCard(
      chunkOf({
        retry: {
          ...pausedRetry,
          pauseReason: 'NO_COMPLIANT_PROVIDER',
          reason: 'LLM_NO_COMPLIANT_PROVIDER',
        },
      })
    );
    expect(screen.getByRole('link', { name: 'LLM settings' })).toHaveAttribute(
      'href',
      '/admin/en/llm-settings'
    );
    expect(screen.getByText(/translate the\s+piece again with another model/)).toBeInTheDocument();
  });

  it('пауза без провайдера на проверке — этап назван, другая модель перевода не предлагается', () => {
    renderCard(
      chunkOf({
        retry: {
          ...pausedRetry,
          pauseReason: 'NO_COMPLIANT_PROVIDER',
          reason: 'CHECK_NO_COMPLIANT_PROVIDER',
        },
      })
    );
    expect(screen.getByText(/Stage «Meaning check» has no model/)).toBeInTheDocument();
    expect(screen.queryByText(/another model/)).not.toBeInTheDocument();
  });

  it('пауза под потолком — ссылка на настройки', () => {
    renderCard(chunkOf({ retry: { ...pausedRetry, pauseReason: 'CEILING_REACHED' } }));
    expect(screen.getByText(/Raise the ceiling/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'LLM settings' })).toBeInTheDocument();
  });

  it('отказ «продолжить» попытки — подписью кода', () => {
    hooks.actions.resumeRetry.error = conflict('RUN_ACTIVE');
    renderCard(chunkOf({ retry: pausedRetry }));
    expect(screen.getByText(/pause the run first/)).toBeInTheDocument();
  });

  it('отказ попытки — подписью причины', () => {
    renderCard(
      chunkOf({
        retry: {
          ...pausedRetry,
          status: 'failed',
          reason: 'RETRY_CANCELLED',
          operationStatus: 'cancelled',
        },
      })
    );
    expect(screen.getByText(/the retry was cancelled/)).toBeInTheDocument();
  });

  it('правка при повторе на паузе — сохранение только через подтверждение с потраченным', async () => {
    renderCard(chunkOf({ retry: pausedRetry }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Translation of block 5'), {
      target: { value: 'five' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(hooks.actions.edit.mutate).not.toHaveBeenCalled();
    expect(await screen.findByText(/paused retry of this piece is cancelled/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go on' }));
    expect(hooks.actions.edit.mutate).toHaveBeenCalledTimes(1);
    expect(hooks.actions.edit.mutate).toHaveBeenCalledWith(
      {
        chunkId: 'c1',
        data: {
          blocks: [
            { n: 4, text: 'translation four' },
            { n: 5, text: 'five' },
          ],
        },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it('попытка на паузе без суммы — подтверждение всё равно есть', async () => {
    renderCard(chunkOf({ retry: { ...pausedRetry, spentUsd: null } }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Translation of block 5'), {
      target: { value: 'five' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(hooks.actions.edit.mutate).not.toHaveBeenCalled();
    expect(await screen.findByText(/what it spent is not returned/)).toBeInTheDocument();
  });

  it('кусок сменился, пока форма открыта, — сохранение только после «взять новый текст»', () => {
    const { rerender } = renderCard(chunkOf());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Translation of block 5'), {
      target: { value: 'mine' },
    });
    const updated = chunkOf({
      blocks: [
        { n: 4, source: 'source four', translation: 'their four' },
        { n: 5, source: 'source five', translation: null },
      ],
    });
    rerender(cardOf(updated));
    expect(screen.getByText(/The piece changed after the form was opened/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Take the new text' }));
    expect(screen.getByLabelText('Translation of block 4')).toHaveValue('their four');
    fireEvent.change(screen.getByLabelText('Translation of block 5'), {
      target: { value: 'mine' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(hooks.actions.edit.mutate).toHaveBeenCalledTimes(1);
  });

  it('без изменений «Save» неактивна: пустая правка не помечает кусок', () => {
    renderCard(chunkOf());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('правка принята — форма закрывается, итог виден на карточке', () => {
    hooks.actions.edit.mutate.mockImplementation(
      (_vars: unknown, options?: { onSuccess?: () => void }) => {
        hooks.actions.edit.data = { chunk: chunkOf(), chapterRewritten: true, reason: null };
        options?.onSuccess?.();
      }
    );
    renderCard(chunkOf());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Translation of block 5'), {
      target: { value: 'five' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.queryByLabelText('Edit the piece')).not.toBeInTheDocument();
    expect(
      screen.getByText(/The piece is saved and the chapter of the draft is rewritten/)
    ).toBeInTheDocument();
  });

  it('повтор принят — форма закрывается', () => {
    hooks.actions.retry.mutate.mockImplementation(
      (_vars: unknown, options?: { onSuccess?: () => void }) => options?.onSuccess?.()
    );
    renderCard(chunkOf());
    fireEvent.click(screen.getByRole('button', { name: 'Translate again' }));
    fireEvent.change(screen.getByLabelText('Limit, $'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start the retry' }));
    expect(screen.queryByLabelText('Translate again')).not.toBeInTheDocument();
  });

  it('каталог моделей не прочитан — плашка с причиной в окне повтора', () => {
    hooks.modelsError = new Error('boom');
    renderCard(chunkOf());
    fireEvent.click(screen.getByRole('button', { name: 'Translate again' }));
    expect(screen.getByRole('alert')).toHaveTextContent('The request failed');
  });

  it('правка без повтора на паузе — сразу, один вызов, все блоки в теле', () => {
    renderCard(chunkOf());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Translation of block 5'), {
      target: { value: 'five' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(hooks.actions.edit.mutate).toHaveBeenCalledTimes(1);
    expect(hooks.actions.edit.mutate).toHaveBeenCalledWith(
      {
        chunkId: 'c1',
        data: {
          blocks: [
            { n: 4, text: 'translation four' },
            { n: 5, text: 'five' },
          ],
        },
      },
      expect.anything()
    );
  });

  it('правка сохранена, глава не переписана — причина, а не успех', () => {
    hooks.actions.edit.data = {
      chunk: chunkOf(),
      chapterRewritten: false,
      reason: 'CHAPTER_EDITED_MANUALLY',
    };
    renderCard(chunkOf());
    expect(
      screen.getByText(/the chapter was not rewritten: the chapter of the draft was edited by hand/)
    ).toBeInTheDocument();
  });

  it('правка сохранена, главы в черновике ещё нет — не отказ, а «запишет запуск»', () => {
    hooks.actions.edit.data = { chunk: chunkOf(), chapterRewritten: false, reason: null };
    renderCard(chunkOf());
    expect(screen.getByText(/not in the draft yet — the run writes it/)).toBeInTheDocument();
    expect(screen.queryByText(/did not assemble/)).not.toBeInTheDocument();
  });

  it('отказ правки по белому списку — списком', () => {
    hooks.actions.edit.error = new ApiError({
      message: 'Bad Request',
      statusCode: 400,
      error: 'Bad Request',
      data: { code: 'CHUNK_BLOCKS_INVALID', message: ['block 4: <div> not allowed'] },
    });
    renderCard(chunkOf());
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByText(/block 4: <div> not allowed/)).toBeInTheDocument();
  });
});
