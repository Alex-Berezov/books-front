/**
 * Снятие последнего автора версии предупреждает редактора (`LEGACY-383`).
 *
 * Бэкенд отдаёт `warning`, когда снят основной `AUTHOR` и авторов у версии не осталось,
 * а унаследованная строка `BookVersion.author` при этом не меняется: публичная карточка
 * книги продолжит показывать прежнее имя. До правки фронт ответ мутации не читал вовсе,
 * и редактор не узнавал ничего.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BookVersionContributorsPanel } from '@/components/admin/books/BookVersionContributorsPanel/BookVersionContributorsPanel';
import type { BookVersionContributor } from '@/types/contributors';

const warningSpy = vi.fn();

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');
  return {
    ...actual,
    message: { ...actual.message, warning: (...args: unknown[]) => warningSpy(...args) },
  };
});

const removeMutate = vi.fn();

vi.mock('@/api/hooks/useBookVersionContributors', () => ({
  useBookVersionContributors: () => ({ data: contributors, isLoading: false }),
  useAddBookVersionContributor: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateBookVersionContributor: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveBookVersionContributor: () => ({ mutate: removeMutate, isPending: false }),
  useReorderBookVersionContributors: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/components/admin/PersonSearchSelect/PersonSearchSelect', () => ({
  PersonSearchSelect: () => null,
}));

const contributors: BookVersionContributor[] = [
  {
    id: 'bvc-1',
    bookVersionId: 'ver-1',
    personId: 'person-1',
    role: 'AUTHOR',
    isPrimary: true,
    displayOrder: 0,
    creditedName: null,
    creditedLanguage: null,
    contributionNoteRu: null,
    person: {
      id: 'person-1',
      type: 'NATURAL_PERSON',
      canonicalName: 'Марк Твен',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  },
];

/** Снять участника через `Popconfirm`: нажать корзину, затем подтвердить. */
const removeFirstContributor = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Снять участника' }));
  await user.click(await screen.findByRole('button', { name: 'Да' }));
};

describe('BookVersionContributorsPanel — снятие последнего автора', () => {
  beforeEach(() => {
    warningSpy.mockClear();
    removeMutate.mockReset();
  });

  it('предупреждает, когда сервер прислал warning', async () => {
    removeMutate.mockImplementation((_id: string, options?: { onSuccess?: (r: unknown) => void }) =>
      options?.onSuccess?.({ success: true, warning: 'Removed the primary AUTHOR contributor.' })
    );

    render(<BookVersionContributorsPanel versionId="ver-1" />);
    await removeFirstContributor();

    await waitFor(() => expect(warningSpy).toHaveBeenCalledTimes(1));
    const text = String(warningSpy.mock.calls[0][0]);
    expect(text).toContain('публичной карточке');
    // Подсказка обязана называть поле, которое и правда чинит расхождение: добавление
    // участника `BookVersion.author` не трогает (`book-version.service.ts`, `addVersionContributor`).
    expect(text).toContain('Автор');
  });

  it('молчит, когда warning не пришёл', async () => {
    removeMutate.mockImplementation((_id: string, options?: { onSuccess?: (r: unknown) => void }) =>
      options?.onSuccess?.({ success: true })
    );

    render(<BookVersionContributorsPanel versionId="ver-1" />);
    await removeFirstContributor();

    await waitFor(() => expect(removeMutate).toHaveBeenCalled());
    expect(warningSpy).not.toHaveBeenCalled();
  });
});
