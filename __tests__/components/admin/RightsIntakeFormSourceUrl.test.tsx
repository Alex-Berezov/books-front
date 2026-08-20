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
  screen.getByPlaceholderText(/may stay empty|e\.g\. 1342/) as HTMLInputElement;

describe('RightsIntakeForm: вывод источника по ссылке (WP-F.1)', () => {
  it('ссылка на Gutenberg заполняет провайдера и внешний ID', () => {
    render(<RightsIntakeForm lang="en" />);

    fireEvent.change(sourceUrlInput(), {
      target: { value: 'https://www.gutenberg.org/ebooks/932' },
    });

    expect(providerSelect().value).toBe('PROJECT_GUTENBERG');
    expect(externalIdInput().value).toBe('932');
  });

  /**
   * WP-M.1: незнакомый домен теперь тоже опознаётся как источник — провайдер `OTHER`.
   * Внешний ID при этом не выдумывается: у такого сайта каталога нет.
   */
  it('незнакомый домен даёт OTHER без внешнего ID', () => {
    render(<RightsIntakeForm lang="en" />);

    fireEvent.change(sourceUrlInput(), { target: { value: 'https://example.com/ebooks/932' } });

    expect(providerSelect().value).toBe('OTHER');
    expect(externalIdInput().value).toBe('');
  });

  it('ссылка на Викитеку заполняет провайдера и заголовок страницы', () => {
    render(<RightsIntakeForm lang="en" />);

    fireEvent.change(sourceUrlInput(), {
      target: {
        value:
          'https://ru.wikisource.org/wiki/%D0%9F%D1%80%D0%B5%D1%81%D1%82%D1%83%D0%BF%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5_%D0%B8_%D0%BD%D0%B0%D0%BA%D0%B0%D0%B7%D0%B0%D0%BD%D0%B8%D0%B5_(%D0%94%D0%BE%D1%81%D1%82%D0%BE%D0%B5%D0%B2%D1%81%D0%BA%D0%B8%D0%B9)',
      },
    });

    expect(providerSelect().value).toBe('OTHER');
    expect(externalIdInput().value).toBe('Преступление_и_наказание_(Достоевский)');
    expect(screen.getByText(/Wikisource \(ru\)/)).toBeInTheDocument();
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
