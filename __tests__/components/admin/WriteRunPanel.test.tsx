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

const view = (
  run: Run | null | undefined,
  over: { discardVars?: string; resumeVars?: { id: string } } = {}
) => {
  const onDiscarded = vi.fn();
  const actions = {
    start: mutation(),
    rebuildDossier: { ...mutation(), isSuccess: false },
    discardRun: mutation<string>(over.discardVars, over.discardVars ? new Error('gone') : null),
    resume: mutation<{ id: string }>(over.resumeVars, over.resumeVars ? new Error('nope') : null),
  };
  render(
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
          useEstimate: () => ({ data: undefined, isError: false, error: null, isFetching: false }),
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
  return { onDiscarded, actions };
};

describe('WriteRunPanel', () => {
  it('«Discard run» after confirmation clears the tab outcomes and discards this run', () => {
    const { onDiscarded, actions } = view(paused());
    fireEvent.click(screen.getByRole('button', { name: 'Discard run' }));
    expect(onDiscarded).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Discard' }));
    expect(onDiscarded).toHaveBeenCalledTimes(1);
    expect(actions.discardRun.mutate).toHaveBeenCalledWith('r1');
  });

  it('a refusal of «Discard run» is shown only for its own run', () => {
    view(paused('r1'), { discardVars: 'r1' });
    expect(screen.getByText('refused: gone')).toBeInTheDocument();
  });

  it('a refusal of «Continue» is shown for its own run', () => {
    view(paused('r1'), { resumeVars: { id: 'op-r1' } });
    expect(screen.getByText('refused: nope')).toBeInTheDocument();
  });

  it('a refusal of another run is not shown', () => {
    view(paused('r2'), { discardVars: 'r1', resumeVars: { id: 'op-r1' } });
    expect(screen.queryByText('refused: gone')).toBeNull();
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
