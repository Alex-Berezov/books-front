import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LicenseFormModal } from '@/components/admin/RightsIntakeDetail/LicensesPanel/LicenseFormModal';

/**
 * 🔴 `LEGACY-447`: ручка лицензии отбивает `documentUrl` не `http(s)` 400. Форма называет
 * поле до запроса — прежний ввод без схемы иначе уходил бы на сервер и возвращался общей ошибкой.
 */

const { createSpy } = vi.hoisted(() => ({ createSpy: vi.fn(() => Promise.resolve({ id: 'l1' })) }));

vi.mock('@/api/hooks/useRightsLicenses', () => ({
  useCreateRightsLicense: () => ({ mutateAsync: createSpy, isPending: false }),
  useUpdateRightsLicense: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const fill = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('LicenseFormModal: documentUrl (LEGACY-447)', () => {
  it.each([
    ['example.org/license.pdf', false],
    ['https://example.org/license.pdf', true],
  ])('documentUrl %j — запрос уходит: %s', async (url, sent) => {
    createSpy.mockClear();
    render(<LicenseFormModal open onClose={vi.fn()} />);

    fill(/Название/, 'Лицензия');
    fill(/Лицензиар/, 'Penguin');
    fill(/Ссылка на документ/, url);
    fireEvent.click(screen.getByRole('button', { name: /Сохранить/ }));

    if (sent) {
      await waitFor(() => expect(createSpy).toHaveBeenCalledTimes(1));
    } else {
      expect(await screen.findByText(/Нужна абсолютная ссылка/)).toBeInTheDocument();
      expect(createSpy).not.toHaveBeenCalled();
    }
  });
});
