import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RightsIntakeForm } from '@/components/admin/rights-intakes/RightsIntakeForm/RightsIntakeForm';

/**
 * WP-F.1 (исток Б1): форма отправляла `provider: UNKNOWN` даже при очевидной ссылке на
 * Gutenberg, а правило манифеста «при нехватке данных — pending review» превращало это в
 * осторожный отчёт. Вывод из ссылки заполняет только пробелы: явный выбор редактора остаётся.
 *
 * WP-M.1: вывод работает на любой площадке, а не только на Gutenberg.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/api/hooks/useRightsIntakes', () => ({
  useCreateRightsIntake: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRightsIntake: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const WIKISOURCE_URL =
  'https://ru.wikisource.org/wiki/%D0%9F%D1%80%D0%B5%D1%81%D1%82%D1%83%D0%BF%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5_%D0%B8_%D0%BD%D0%B0%D0%BA%D0%B0%D0%B7%D0%B0%D0%BD%D0%B8%D0%B5_(%D0%94%D0%BE%D1%81%D1%82%D0%BE%D0%B5%D0%B2%D1%81%D0%BA%D0%B8%D0%B9)';

const sourceUrlInput = (): HTMLInputElement =>
  screen.getByPlaceholderText(/^https:\/\//) as HTMLInputElement;

const providerSelect = (): HTMLSelectElement =>
  screen.getAllByRole('combobox')[0] as HTMLSelectElement;

const externalIdInput = (): HTMLInputElement =>
  screen.getByPlaceholderText(/may stay empty|e\.g\. 1342/) as HTMLInputElement;

const textTypeSelect = (): HTMLSelectElement =>
  screen.getAllByRole('combobox')[1] as HTMLSelectElement;

const languageInputs = () => ({
  original: screen.getByPlaceholderText(/e\.g\. en, grc, lat/) as HTMLInputElement,
  source: screen.getByPlaceholderText(/^e\.g\. en$/) as HTMLInputElement,
});

/** Ввод по одному символу: именно так адрес попадает в поле у живого редактора. */
const typeUrl = (url: string): void => {
  for (let i = 1; i <= url.length; i += 1) {
    fireEvent.change(sourceUrlInput(), { target: { value: url.slice(0, i) } });
  }
};

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
   * WP-M.1: у незнакомой площадки провайдер остаётся `UNKNOWN` — `OTHER` был бы тем же
   * «неизвестно», но уже неотличимым от выбора редактора.
   */
  it('незнакомый домен не назначает провайдера и не выдумывает внешний ID', () => {
    render(<RightsIntakeForm lang="en" />);

    fireEvent.change(sourceUrlInput(), { target: { value: 'https://example.com/ebooks/932' } });

    expect(providerSelect().value).toBe('UNKNOWN');
    expect(externalIdInput().value).toBe('');
  });

  it('ссылка на Викитеку заполняет провайдера, заголовок страницы и называет площадку', () => {
    render(<RightsIntakeForm lang="en" />);

    fireEvent.change(sourceUrlInput(), { target: { value: WIKISOURCE_URL } });

    expect(providerSelect().value).toBe('OTHER');
    expect(externalIdInput().value).toBe('Преступление_и_наказание_(Достоевский)');
    expect(screen.getByText(/Wikisource \(ru\)/)).toBeInTheDocument();
  });

  /**
   * Адрес набирается посимвольно, и каждый огрызок разбирается как самостоятельная ссылка:
   * `new URL('https://w')` успешен. Без памяти о собственных подстановках форма замерзала
   * на первом же промежуточном значении — дописанный до конца адрес Gutenberg оставался
   * с чужим провайдером и с внешним ID из одной цифры.
   */
  describe('посимвольный ввод', () => {
    it('дописанный до конца адрес Gutenberg даёт правильного провайдера и номер', () => {
      render(<RightsIntakeForm lang="en" />);

      typeUrl('https://www.gutenberg.org/ebooks/1342');

      expect(providerSelect().value).toBe('PROJECT_GUTENBERG');
      expect(externalIdInput().value).toBe('1342');
    });

    it('дописанный до конца адрес Викитеки даёт полный заголовок страницы', () => {
      render(<RightsIntakeForm lang="en" />);

      typeUrl('https://ru.wikisource.org/wiki/Бедные_люди');

      expect(providerSelect().value).toBe('OTHER');
      expect(externalIdInput().value).toBe('Бедные_люди');
    });

    it('стёртая до незнакомого огрызка ссылка возвращает провайдера в UNKNOWN', () => {
      render(<RightsIntakeForm lang="en" />);

      fireEvent.change(sourceUrlInput(), {
        target: { value: 'https://www.gutenberg.org/ebooks/1342' },
      });
      expect(providerSelect().value).toBe('PROJECT_GUTENBERG');

      fireEvent.change(sourceUrlInput(), { target: { value: 'https://example.com/' } });

      expect(providerSelect().value).toBe('UNKNOWN');
      expect(externalIdInput().value).toBe('');
    });
  });

  /**
   * Тип текста — утверждение о природе источника. Оно выводится только там, где про площадку
   * известно, что она выкладывает тексты произведений.
   */
  describe('вывод типа текста', () => {
    const fillLanguages = (): void => {
      fireEvent.change(languageInputs().original, { target: { value: 'ru' } });
      fireEvent.change(languageInputs().source, { target: { value: 'ru' } });
    };

    it('ставит ORIGINAL_TEXT для Викитеки при совпадении языков', () => {
      render(<RightsIntakeForm lang="en" />);
      fillLanguages();

      fireEvent.change(sourceUrlInput(), { target: { value: WIKISOURCE_URL } });

      expect(textTypeSelect().value).toBe('ORIGINAL_TEXT');
    });

    it('не ставит ORIGINAL_TEXT для незнакомого сайта даже при совпадении языков', () => {
      render(<RightsIntakeForm lang="en" />);
      fillLanguages();

      fireEvent.change(sourceUrlInput(), { target: { value: 'https://example.com/book' } });

      expect(textTypeSelect().value).toBe('UNKNOWN');
    });

    it('не ставит ORIGINAL_TEXT для статьи Википедии', () => {
      render(<RightsIntakeForm lang="en" />);
      fillLanguages();

      fireEvent.change(sourceUrlInput(), {
        target: { value: 'https://ru.wikipedia.org/wiki/Бедные_люди' },
      });

      expect(textTypeSelect().value).toBe('UNKNOWN');
    });
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

  /**
   * Подсказка утверждает, что поля заполнило приложение. Пока оно ничего не заполняло,
   * подсказки быть не должно — иначе она приписывает приложению работу человека.
   */
  it('не обещает автозаполнение там, где его не было', () => {
    render(<RightsIntakeForm lang="en" />);

    fireEvent.change(providerSelect(), { target: { value: 'OTHER' } });
    fireEvent.change(sourceUrlInput(), { target: { value: 'https://example.com/book' } });

    expect(screen.queryByText(/Bibliaris recognised this link/)).toBeNull();
  });
});
