import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EditionNotes } from '@/components/public/books/EditionNotes';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import type { VersionPreview } from '@/types/api-schema';

/**
 * Блок «Об издании» (`F01-5`, `product.md` §6.2): строка есть, только если есть значение; блока нет,
 * если нет ни одной строки, кроме постоянной; имя и ссылка на источник текста не показываются (D6).
 */

const version = (extra: Partial<VersionPreview> = {}): VersionPreview => ({
  id: 'v1',
  type: 'text',
  isFree: true,
  title: 'Crime and Punishment',
  translators: [],
  ...extra,
});

const lines = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('li')).map((li) => li.textContent?.replace(/\s+/g, ' '));

describe('EditionNotes', () => {
  it('ru: все строки, язык оригинала названием на языке страницы', () => {
    const { container } = render(
      <EditionNotes
        lang="ru"
        version={version({
          originalLanguage: 'en',
          originalTitle: 'Crime and Punishment (orig)',
          translators: [{ name: 'Констанс Гарнетт' }, { name: 'Второй Переводчик' }],
        })}
        firstPublishedYear={1866}
        shownTitle="Преступление и наказание"
      />
    );

    expect(lines(container)).toEqual([
      'Впервые опубликовано: 1866',
      'Язык оригинала: английский',
      'Название в оригинале: Crime and Punishment (orig)',
      'Перевод: Констанс Гарнетт, Второй Переводчик',
      'Текст публикуется по изданию, находящемуся в общественном достоянии. Подробнее',
    ]);
  });

  // Решение арбитра `F01 | F01-5`: свободный текст админки («e.g. English») распознаётся по английскому
  // названию; нераспознанное значение строки не даёт - английское слово на чужом языке было бы браком.
  it.each([
    ['English', 'ru', 'Язык оригинала: английский'],
    ['  russian ', 'es', 'Idioma original: ruso'],
    ['FR', 'pt', 'Idioma original: francês'],
    ['Русский', 'es', 'Idioma original: ruso'],
    ['grc', 'ru', 'Язык оригинала: древнегреческий'],
    ['Ancient Greek', 'en', 'Original language: Ancient Greek'],
  ] as const)('«%s» на %s - название на языке страницы', (value, lang, expected) => {
    const { container } = render(
      <EditionNotes
        lang={lang}
        version={version({ originalLanguage: value })}
        firstPublishedYear={1866}
        shownTitle="Book"
      />
    );
    expect(lines(container)).toContain(expected);
  });

  it.each(['Old Church Slavonic', 'Ger', 'xx', 'Elvish', 'эльфийский'])(
    'нераспознанное «%s» строки не даёт',
    (value) => {
      const { container } = render(
        <EditionNotes
          lang="ru"
          version={version({ originalLanguage: value })}
          firstPublishedYear={1866}
          shownTitle="Book"
        />
      );
      expect(lines(container).join('|')).not.toContain('Язык оригинала');
    }
  );

  it('fr: неразрывный пробел перед двоеточием', () => {
    const { container } = render(
      <EditionNotes lang="fr" version={version()} firstPublishedYear={1866} shownTitle="B" />
    );
    expect(container.querySelector('li')?.textContent).toBe('Première publication : 1866');
  });

  it('название в оригинале совпадает с показанным - строки нет', () => {
    const { container } = render(
      <EditionNotes
        lang="en"
        version={version({ originalTitle: 'Crime and Punishment', originalLanguage: 'ru' })}
        shownTitle="Crime and Punishment"
      />
    );
    expect(lines(container).join('|')).not.toContain('Original title');
  });

  it('пустые поля - строк нет; пробелы вместо имени переводчика не дают строки', () => {
    const { container } = render(
      <EditionNotes
        lang="en"
        version={version({ originalLanguage: '  ', translators: [{ name: '  ' }] })}
        firstPublishedYear={1866}
        shownTitle="Book"
      />
    );
    expect(lines(container)).toEqual([
      'First published: 1866',
      'The text is published from an edition that is in the public domain. Learn more',
    ]);
  });

  it('нет ни одной строки, кроме постоянной, - нет и блока', () => {
    const { container } = render(
      <EditionNotes lang="en" version={version({ translators: [] })} shownTitle="Book" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it.each(SUPPORTED_LANGS)(
    '%s: постоянная строка ведёт на #sources и не называет источник',
    (lang) => {
      const { container } = render(
        <EditionNotes lang={lang} version={version()} firstPublishedYear={1866} shownTitle="B" />
      );
      const dict = getDictionary(lang).book;
      const link = screen.getByRole('link', { name: dict.editionLearnMore });
      expect(link.getAttribute('href')).toBe(`/${lang}/editorial-policy#sources`);
      expect(container.textContent).toContain(dict.editionPublicDomain);
      expect(container.innerHTML).not.toMatch(/gutenberg|wikisource|archive\.org/i);
    }
  );
});
