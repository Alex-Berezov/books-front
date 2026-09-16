/**
 * Осиротевший объект в хранилище не прячется под зелёным тостом (`LEGACY-382`).
 *
 * `DELETE /media/:id` отвечает 200 в обоих случаях, и единственный признак расхождения базы
 * с хранилищем — поле `storageDeleted` в теле ответа. При `false` запись снята, а файл в бакете
 * остался и не находится больше ни одним критерием по базе (`LEGACY-058`): снимать его придётся
 * руками. До правки экран печатал «File deleted successfully» безусловно.
 */

import type { ReactElement } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import MediaPage from '@/app/admin/[lang]/media/page';
import type { MediaFile } from '@/types/api-schema/media';

const enqueueSnackbar = vi.fn();
const closeSnackbar = vi.fn();
const deleteMedia = vi.fn();

vi.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar, closeSnackbar }),
}));

vi.mock('@/api/hooks/useMedia', () => ({
  useMediaFiles: () => ({
    data: { items: mediaFiles, pagination: { total: 1, page: 1, limit: 20, totalPages: 1 } },
    isLoading: false,
  }),
  useDeleteMedia: () => ({ mutateAsync: deleteMedia, isPending: false }),
}));

const mediaFiles: MediaFile[] = [
  {
    id: 'media-1',
    url: 'https://cdn.example.com/cover.jpg',
    filename: 'cover.jpg',
    mimeType: 'image/jpeg',
    size: 1024,
    type: 'image',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
];

/** Нажать удаление на карточке файла и подтвердить его в модальном окне. */
const confirmDelete = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByTitle('Delete'));
  const dialog = await screen.findByRole('dialog');
  await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
};

describe('Медиатека: удаление файла', () => {
  beforeEach(() => {
    enqueueSnackbar.mockClear();
    closeSnackbar.mockClear();
    deleteMedia.mockReset();
  });

  it('предупреждает и называет файл, когда объект остался в хранилище', async () => {
    deleteMedia.mockResolvedValue({ success: true, storageDeleted: false });

    render(<MediaPage />);
    await confirmDelete();

    await waitFor(() => expect(enqueueSnackbar).toHaveBeenCalled());
    expect(enqueueSnackbar).toHaveBeenCalledTimes(1);
    const [text, options] = enqueueSnackbar.mock.calls[0];
    expect(options).toMatchObject({ variant: 'warning' });
    expect(String(text)).toContain('cover.jpg');
    expect(String(text)).toContain('https://cdn.example.com/cover.jpg');
    expect(options).toMatchObject({ persist: true });
  });

  it('предупреждение убирается кнопкой — оно не гаснет само', async () => {
    deleteMedia.mockResolvedValue({ success: true, storageDeleted: false });

    render(<MediaPage />);
    await confirmDelete();
    await waitFor(() => expect(enqueueSnackbar).toHaveBeenCalled());

    // `persist: true` без работающей кнопки — это тост, который никогда не уйдёт с экрана.
    // Поэтому кнопка не просто рисуется, а нажимается: проверяется путь целиком.
    const { action } = enqueueSnackbar.mock.calls[0][1] as {
      action: (key: string) => ReactElement;
    };
    render(action('snack-1'));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(closeSnackbar).toHaveBeenCalledWith('snack-1');
  });

  it('отчитывается успехом, когда объект снят и из хранилища', async () => {
    deleteMedia.mockResolvedValue({ success: true, storageDeleted: true });

    render(<MediaPage />);
    await confirmDelete();

    await waitFor(() => expect(enqueueSnackbar).toHaveBeenCalled());
    expect(enqueueSnackbar).toHaveBeenCalledTimes(1);
    expect(enqueueSnackbar).toHaveBeenCalledWith('File deleted successfully', {
      variant: 'success',
    });
  });
});
