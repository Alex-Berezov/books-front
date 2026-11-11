import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WriteRunPanel } from '@/components/admin/books/ContentDraft';
import type { ContentDraftStatus, LlmOperation } from '@/types/api-schema';

/**
 * T179: каркас панели хода, общий у «Write Summary» и «Write Analysis» — сброс хода
 * с подтверждением снимает итоги вкладки, отказы «Discard run» и «Continue» только своего хода.
 */

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

type Run = {
  id: string;
  status: ContentDraftStatus;
  failedReason: string | null;
  operation: Pick<LlmOperation, 'id' | 'status' | 'pauseReason'>;
};

const paused = (id = 'r1'): Run => ({
  id,
  status: 'building',
  failedReason: null,
  operation: { id: `op-${id}`, status: 'paused', pauseReason: 'CEILING_REACHED' },
});

const mutation = <V,>(variables?: V, error: unknown = null) => ({
  mutate: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  variables,
  error,
});

type DiscardOptions = { onSuccess?: () => void };

const makeActions = (over: { discardError?: boolean; resumeVars?: { id: string } } = {}) => {
  const discardRun = {
    ...mutation<string>(undefined, over.discardError ? new Error('gone') : null),
    mutate: vi.fn<(id: string, options?: DiscardOptions) => void>(),
    // Как у react-query: `reset` снимает ошибку мутации.
    reset: vi.fn(() => {
      discardRun.error = null;
    }),
  };
  return {
    start: mutation(),
    rebuildDossier: { ...mutation(), isSuccess: false },
    discardRun,
    resume: mutation<{ id: string }>(over.resumeVars, over.resumeVars ? new Error('nope') : null),
  };
};

const element = (
  run: Run | null | undefined,
  actions: ReturnType<typeof makeActions>,
  onDiscarded: () => void
) => (
  <QueryClientProvider client={new QueryClient()}>
    <WriteRunPanel
      versionId="v1"
      lang="en"
      label="Write Test"
      noun="test"
      run={run}
      isError={false}
      refetch={vi.fn()}
      actions={actions}
      start={{
        buildingHint: 'building',
        rebuiltHint: 'rebuilt',
        useEstimate: () => ({
          data: { dossier: null, glossary: null },
          isError: false,
          error: null,
          isFetching: false,
        }),
        estimateText: () => '',
        loss: '',
      }}
      progressText={() => 'Paused'}
      reasonText={(r) => `reason ${r}`}
      refusalText={(e) => `refused: ${(e as Error).message}`}
      discardMessage="Discard?"
      onDiscarded={onDiscarded}
      beforeProgress={<p>core banner</p>}
    >
      <p>run items</p>
    </WriteRunPanel>
  </QueryClientProvider>
);

const view = (
  run: Run | null | undefined,
  over: { discardError?: boolean; resumeVars?: { id: string } } = {}
) => {
  const onDiscarded = vi.fn();
  const actions = makeActions(over);
  const utils = render(element(run, actions, onDiscarded));
  const rerender = (next: Run | null | undefined) =>
    utils.rerender(element(next, actions, onDiscarded));
  return { onDiscarded, actions, rerender };
};

describe('WriteRunPanel', () => {
  const confirmDiscard = () =>
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Discard' }));

  /** Колбэк успеха, переданный в `mutate` сброса: без него итоги не снимутся никогда. */
  const onSuccessOf = (actions: ReturnType<typeof makeActions>) => {
    expect(actions.discardRun.mutate).toHaveBeenCalledTimes(1);
    const onSuccess = actions.discardRun.mutate.mock.calls[0][1]?.onSuccess;
    expect(onSuccess).toBeTypeOf('function');
    return onSuccess as () => void;
  };

  it('«Discard run» discards this run and names it to the tab only after the answer', () => {
    const { onDiscarded, actions } = view(paused());
    fireEvent.click(screen.getByRole('button', { name: 'Discard run' }));
    confirmDiscard();
    expect(actions.discardRun.mutate).toHaveBeenCalledWith('r1', {
      onSuccess: expect.any(Function),
    });
    expect(onDiscarded).not.toHaveBeenCalled();
    onSuccessOf(actions)();
    expect(onDiscarded).toHaveBeenCalledWith('r1');
  });

  it('the run of the open dialog is discarded and named, even if the poll brought another one', () => {
    const { onDiscarded, actions, rerender } = view(paused('r1'));
    fireEvent.click(screen.getByRole('button', { name: 'Discard run' }));
    rerender(paused('r2'));
    confirmDiscard();
    expect(actions.discardRun.mutate).toHaveBeenCalledWith('r1', expect.anything());
    // Ответ пришёл, на экране уже r2: вкладке назван r1, итог r2 она не трогает.
    onSuccessOf(actions)();
    expect(onDiscarded).toHaveBeenCalledWith('r1');
  });

  it('the answer after the discarded run left the screen still names it to the tab', () => {
    const { onDiscarded, actions, rerender } = view(paused('r1'));
    fireEvent.click(screen.getByRole('button', { name: 'Discard run' }));
    confirmDiscard();
    // Перечитанный `latest` после сброса — без хода; ответ сброса приходит уже после этого.
    rerender(null);
    onSuccessOf(actions)();
    expect(onDiscarded).toHaveBeenCalledWith('r1');
  });

  it('a refusal of «Discard run» does not clear the outcomes and stays after the dialog closes', () => {
    const { onDiscarded, actions, rerender } = view(paused('r1'));
    fireEvent.click(screen.getByRole('button', { name: 'Discard run' }));
    confirmDiscard();
    expect(screen.queryByRole('dialog')).toBeNull();
    // Отказ: колбэк успеха не зовётся, у мутации ошибка.
    actions.discardRun.error = new Error('gone');
    rerender(paused('r1'));
    expect(screen.getByText('refused: gone')).toBeInTheDocument();
    expect(onDiscarded).not.toHaveBeenCalled();
  });

  it('a refusal of «Discard run» stays when the poll brings another run', () => {
    view(paused('r2'), { discardError: true });
    expect(screen.getByText('refused: gone')).toBeInTheDocument();
  });

  it('a refusal of «Discard run» goes away with a new start from this panel, not with opening its dialog', () => {
    const failed = { ...paused('r1'), status: 'failed' as const, failedReason: 'X' };
    const { actions, rerender } = view(failed, { discardError: true });
    fireEvent.click(screen.getByRole('button', { name: 'Write Test' }));
    rerender(failed);
    // Открытие окна старта (там `start.reset()`) отказ сброса не снимает.
    expect(screen.getByText('refused: gone')).toBeInTheDocument();
    expect(actions.discardRun.reset).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Start' }));
    expect(actions.start.mutate).toHaveBeenCalledWith({});
    expect(actions.discardRun.reset).toHaveBeenCalledTimes(1);
    rerender({ ...paused('r2'), operation: { id: 'op-r2', status: 'active', pauseReason: null } });
    expect(screen.queryByText('refused: gone')).toBeNull();
  });

  it('a start while a discard is still in flight does not reset it: its answer is not cut off', () => {
    const failed = { ...paused('r1'), status: 'failed' as const, failedReason: 'X' };
    const { actions, rerender } = view(failed);
    actions.discardRun.isPending = true;
    rerender(failed);
    fireEvent.click(screen.getByRole('button', { name: 'Write Test' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Start' }));
    expect(actions.start.mutate).toHaveBeenCalledTimes(1);
    expect(actions.discardRun.reset).not.toHaveBeenCalled();
  });

  it('cancelling the start dialog keeps the refusal of «Discard run»', () => {
    const failed = { ...paused('r1'), status: 'failed' as const, failedReason: 'X' };
    const { actions } = view(failed, { discardError: true });
    fireEvent.click(screen.getByRole('button', { name: 'Write Test' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(actions.discardRun.reset).not.toHaveBeenCalled();
    expect(screen.getByText('refused: gone')).toBeInTheDocument();
  });

  it('a refusal of «Continue» is shown for its own run', () => {
    view(paused('r1'), { resumeVars: { id: 'op-r1' } });
    expect(screen.getByText('refused: nope')).toBeInTheDocument();
  });

  it('a refusal of «Continue» of another run is not shown', () => {
    view(paused('r2'), { resumeVars: { id: 'op-r1' } });
    expect(screen.queryByText('refused: nope')).toBeNull();
  });

  it('a failed run shows its reason', () => {
    view({ ...paused(), status: 'failed', failedReason: 'X' });
    expect(screen.getByText('Failed: reason X.')).toBeInTheDocument();
  });

  it('no answer yet — loading line', () => {
    view(undefined);
    expect(screen.getByText('Loading the test run…')).toBeInTheDocument();
  });

  it('renders the slot before the progress line, the progress text and the run content', () => {
    view(paused());
    expect(screen.getByText('core banner')).toBeInTheDocument();
    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.getByText('run items')).toBeInTheDocument();
  });
});
