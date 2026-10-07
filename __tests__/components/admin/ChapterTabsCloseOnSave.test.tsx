import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { useListenContentTab } from '@/components/admin/books/ListenContentTab/useListenContentTab';
import { useReadContentTab } from '@/components/admin/books/ReadContentTab/useReadContentTab';
import { toUserMessage } from '@/lib/errors';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  enqueueSnackbar: vi.fn(),
}));

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: mocks.enqueueSnackbar }) }));

vi.mock('@/api/hooks', () => {
  const list = () => ({
    data: { items: [{ id: 'c1', number: 1, title: 'T', duration: 60 }] },
    error: null,
    isLoading: false,
  });
  const mutation = (mutateAsync = vi.fn()) => ({ mutateAsync, isPending: false });
  return {
    useChapters: list,
    useAudioChapters: list,
    useCreateChapter: () => mutation(mocks.create),
    useCreateAudioChapter: () => mutation(mocks.create),
    useUpdateChapter: () => mutation(mocks.update),
    useUpdateAudioChapter: () => mutation(mocks.update),
    useDeleteChapter: () => mutation(),
    useDeleteAudioChapter: () => mutation(),
  };
});

interface TabView {
  isOpen: boolean;
  add: () => void;
  edit: () => void;
  save: () => Promise<void>;
}

const useReadTab = (): TabView => {
  const tab = useReadContentTab({ versionId: 'v1' });
  return {
    isOpen: tab.isModalOpen,
    add: tab.handleAddChapter,
    edit: () => tab.handleEditChapter('c1'),
    save: () => tab.handleSaveChapter({ title: 'T', content: '', number: 1 }),
  };
};

const useListenTab = (): TabView => {
  const tab = useListenContentTab({ versionId: 'v1' });
  return {
    isOpen: tab.isModalOpen,
    add: tab.handleAddAudioChapter,
    edit: () => tab.handleEditAudioChapter('c1'),
    save: () =>
      tab.handleSaveAudioChapter({
        title: 'T',
        number: 1,
        audioUrl: 'https://cdn.example.com/a.mp3',
        mediaId: null,
        duration: 60,
        description: null,
        transcript: null,
      }),
  };
};

/**
 * The chapter dialogs no longer close themselves after onSubmit (LEGACY-439): the tab hook
 * is the only place that closes them, and only after a successful save, in both the create
 * and the edit branch.
 */
describe.each([
  ['useReadContentTab', useReadTab],
  ['useListenContentTab', useListenTab],
] as const)('%s save', (_name, useTab) => {
  let consoleError: MockInstance<typeof console.error>;

  beforeEach(() => {
    mocks.create.mockReset();
    mocks.update.mockReset();
    mocks.enqueueSnackbar.mockReset();
    consoleError = vi.spyOn(console, 'error');
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  describe.each([
    ['create', (tab: TabView) => tab.add(), () => mocks.create],
    ['edit', (tab: TabView) => tab.edit(), () => mocks.update],
  ] as const)('%s', (_mode, open, mutation) => {
    it('closes the dialog after a successful save', async () => {
      mutation().mockResolvedValue({});
      const { result } = renderHook(useTab);

      act(() => open(result.current));
      expect(result.current.isOpen).toBe(true);
      await act(() => result.current.save());

      expect(result.current.isOpen).toBe(false);
      expect(consoleError).not.toHaveBeenCalled();
    });

    it('keeps the dialog open and shows the error after a failed save', async () => {
      const error = new Error('conflict');
      mutation().mockRejectedValue(error);
      consoleError.mockImplementation(() => undefined);
      const { result } = renderHook(useTab);

      act(() => open(result.current));
      await act(() => result.current.save());

      expect(result.current.isOpen).toBe(true);
      expect(mocks.enqueueSnackbar).toHaveBeenCalledTimes(1);
      expect(mocks.enqueueSnackbar).toHaveBeenCalledWith(toUserMessage(error), {
        variant: 'error',
      });
    });
  });
});
