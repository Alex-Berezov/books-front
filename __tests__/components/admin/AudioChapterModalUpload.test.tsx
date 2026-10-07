/**
 * `AudioChapterModal`: во время загрузки аудио × и Cancel выключены (`LEGACY-438`).
 * Окно, закрытое посреди загрузки, теряло описание и транскрипт, а загруженный файл
 * оставался без главы. После отказа загрузки закрытие снова доступно.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioChapterModal } from '@/components/admin/books/ListenContentTab/AudioChapterModal';

const uploadAudioFile = vi.fn();

vi.mock('@/api/endpoints/admin/uploads', () => ({
  uploadAudioFile: (...args: unknown[]) => uploadAudioFile(...args),
}));

vi.mock('@/api/hooks', () => ({
  useUploadsLimits: () => ({
    data: { audio: { allowedContentTypes: ['audio/mpeg'], maxSizeMb: 50 } },
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: vi.fn() }),
}));

const detectAudioDuration = vi.fn();

vi.mock('@/lib/utils/audio', () => ({
  detectAudioDuration: (...args: unknown[]) => detectAudioDuration(...args),
  formatDuration: (value: number) => String(value),
  validateUploadFile: vi.fn(() => null),
}));

const renderModal = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AudioChapterModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} />
    </QueryClientProvider>
  );
};

const dropFile = () => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([new Uint8Array(10)], 'track.mp3', { type: 'audio/mpeg' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
};

describe('AudioChapterModal: закрытие во время загрузки аудио', () => {
  beforeEach(() => {
    uploadAudioFile.mockReset();
    detectAudioDuration.mockReset();
    detectAudioDuration.mockResolvedValue(42);
  });

  it('× and Cancel are disabled while the file uploads and enabled again after a failure', async () => {
    let reject: (reason: Error) => void = () => undefined;
    uploadAudioFile.mockReturnValue(
      new Promise((_resolve, rej) => {
        reject = rej;
      })
    );
    renderModal();

    const cross = screen.getByRole('button', { name: 'Close modal' });
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    expect(cross).toBeEnabled();
    expect(cancel).toBeEnabled();

    dropFile();
    await waitFor(() => expect(cross).toBeDisabled());
    expect(cancel).toBeDisabled();

    reject(new Error('network'));
    await waitFor(() => expect(cross).toBeEnabled());
    expect(cancel).toBeEnabled();
  });

  it('× and Cancel are enabled again after a successful upload', async () => {
    let resolve: (asset: unknown) => void = () => undefined;
    uploadAudioFile.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      })
    );
    renderModal();

    const cross = screen.getByRole('button', { name: 'Close modal' });
    dropFile();
    await waitFor(() => expect(cross).toBeDisabled());

    resolve({ id: '7f1c2a3e-0000-4000-8000-000000000001', url: 'https://cdn/a.mp3', duration: 42 });
    await waitFor(() => expect(cross).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
  });

  it('× and Cancel are enabled again when the duration probe throws (createObjectURL, new Audio)', async () => {
    detectAudioDuration.mockRejectedValue(new Error('probe'));
    renderModal();

    dropFile();
    await waitFor(() => expect(detectAudioDuration).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close modal' })).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    expect(uploadAudioFile).not.toHaveBeenCalled();
  });

  it('Cancel upload aborts a hung upload and gives × and Cancel back', async () => {
    let signal: AbortSignal | undefined;
    uploadAudioFile.mockImplementation((_file: File, options: { signal?: AbortSignal }) => {
      signal = options.signal;
      return new Promise(() => undefined);
    });
    renderModal();

    const cross = screen.getByRole('button', { name: 'Close modal' });
    dropFile();
    await waitFor(() => expect(cross).toBeDisabled());

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel upload' }));

    await waitFor(() => expect(cross).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    expect(signal?.aborted).toBe(true);
  });

  it('a late answer of a cancelled upload neither fills the form nor unlocks the next upload', async () => {
    const pending: Array<{ resolve: (asset: unknown) => void; reject: (e: Error) => void }> = [];
    uploadAudioFile.mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          pending.push({ resolve, reject });
        })
    );
    renderModal();

    const cross = screen.getByRole('button', { name: 'Close modal' });
    dropFile();
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel upload' }));
    await waitFor(() => expect(cross).toBeEnabled());

    dropFile();
    await waitFor(() => expect(pending).toHaveLength(2));
    expect(cross).toBeDisabled();

    pending[0].resolve({
      id: '7f1c2a3e-0000-4000-8000-000000000001',
      url: 'https://cdn/first.mp3',
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(cross).toBeDisabled();

    pending[1].reject(new Error('network'));
    await waitFor(() => expect(cross).toBeEnabled());
    expect(screen.queryByText('https://cdn/first.mp3')).toBeNull();
  });
});
