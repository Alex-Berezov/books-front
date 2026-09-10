/**
 * `AudioPicker`: файл не уходит на сервер, пока не пришли лимиты загрузки.
 *
 * До 10.09.2026 ветка «лимиты ещё не пришли» была мертва - вариант B не работал вовсе
 * (`LEGACY-372`: адрес собирался в `undefined`). Как только загрузка починена, ветка стала
 * живой: файл, брошенный в первые сотни миллисекунд или при отказе `GET /uploads/limits`,
 * уходил бы по сети без проверки размера и типа, а отказ приходил бы от сервера - 413 или 415
 * после выгрузки тела.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioPicker } from '@/components/admin/books/ListenContentTab/AudioPicker';

const uploadAudioFile = vi.fn();
const limits = vi.fn();

vi.mock('@/api/endpoints/admin/uploads', () => ({
  uploadAudioFile: (...args: unknown[]) => uploadAudioFile(...args),
}));

vi.mock('@/api/hooks', () => ({
  useUploadsLimits: () => limits(),
}));

vi.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: vi.fn() }),
}));

vi.mock('@/lib/utils/audio', () => ({
  detectAudioDuration: vi.fn(() => Promise.resolve(42)),
  formatDuration: (value: number) => String(value),
  validateUploadFile: vi.fn(() => null),
}));

/** Компонент зовёт useQueryClient, чтобы сбросить список медиатеки после загрузки. */
const renderPicker = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AudioPicker value={null} onChange={vi.fn()} />
    </QueryClientProvider>
  );
};

const dropFile = () => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([new Uint8Array(10)], 'track.mp3', { type: 'audio/mpeg' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
};

describe('AudioPicker: загрузка до прихода лимитов', () => {
  beforeEach(() => {
    uploadAudioFile.mockReset();
    uploadAudioFile.mockResolvedValue({ id: 'm-1', url: 'https://cdn/a.mp3', duration: 42 });
    limits.mockReset();
  });

  it('без лимитов файл не уходит на сервер и причина названа', async () => {
    limits.mockReturnValue({ data: undefined, isError: false, refetch: vi.fn() });

    renderPicker();
    dropFile();

    expect(await screen.findByText(/Upload limits are still loading/i)).toBeInTheDocument();
    expect(uploadAudioFile).not.toHaveBeenCalled();
  });

  it('лимиты не пришли вовсе — причина названа честно и запускается повтор', async () => {
    const refetch = vi.fn();
    limits.mockReturnValue({ data: undefined, isError: true, refetch });

    renderPicker();
    dropFile();

    expect(await screen.findByText(/Upload limits are unavailable/i)).toBeInTheDocument();
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(uploadAudioFile).not.toHaveBeenCalled();
  });

  it('с лимитами тот же файл уходит', async () => {
    limits.mockReturnValue({
      data: { audio: { maxSizeMb: 100, allowedContentTypes: ['audio/mpeg'] } },
      isError: false,
      refetch: vi.fn(),
    });

    renderPicker();
    dropFile();

    await vi.waitFor(() => expect(uploadAudioFile).toHaveBeenCalledTimes(1));
  });
});
