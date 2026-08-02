import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RightsIntakeForm } from '@/components/admin/rights-intakes/RightsIntakeForm/RightsIntakeForm';

/**
 * WP-F.1 (исток Б1): форма отправляла `provider: UNKNOWN` даже при очевидной ссылке на
 * Gutenberg, а правило манифеста «при нехватке данных — pending review» превращало это в
 * осторожный отчёт. Вывод из ссылки заполняет только пробелы: явный выбор редактора остаётся.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/api/hooks/useRightsIntakes', () => ({
  useCreateRightsIntake: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRightsIntake: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const sourceUrlInput = (): HTMLInputElement =>
  screen.getByPlaceholderText(/^https:\/\//) as HTMLInputElement;

const providerSelect = (): HTMLSelectElement =>
  screen.getAllByRole('combobox')[0] as HTMLSelectElement;

const externalIdInput = (): HTMLInputElement =>
  screen.getByPlaceholderText(/external-id-123|e\.g\. 1342/) as HTMLInputElement;

describe('RightsIntakeForm: вывод источника по ссылке (WP-F.1)', () => {
  it('ссылка на Gutenberg заполняет провайдера и внешний ID', () => {
    render(<RightsIntakeForm lang="en" />);

    fireEvent.change(sourceUrlInput(), {
      target: { value: 'https://www.gutenberg.org/ebooks/932' },
    });

    expect(providerSelect().value).toBe('PROJECT_GUTENBERG');
    expect(externalIdInput().value).toBe('932');
  });

  it('чужой домен провайдера не выводит', () => {
    render(<RightsIntakeForm lang="en" />);

    fireEvent.change(sourceUrlInput(), { target: { value: 'https://example.com/ebooks/932' } });

    expect(providerSelect().value).toBe('UNKNOWN');
    expect(externalIdInput().value).toBe('');
  });

  it('явный выбор редактора не переписывается', () => {
    render(<RightsIntakeForm lang="en" />);

    fireEvent.change(providerSelect(), { target: { value: 'OTHER' } });
    fireEvent.change(externalIdInput(), { target: { value: 'manual-7' } });
    fireEvent.change(sourceUrlInput(), {
      target: { value: 'https://www.gutenberg.org/ebooks/932' },
    });

    expect(providerSelect().value).toBe('OTHER');
    expect(externalIdInput().value).toBe('manual-7');
  });
});
