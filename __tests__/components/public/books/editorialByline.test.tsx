import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EditorialByline } from '@/components/public/books/EditorialByline';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';

/** Подпись редакции (`F01-5`, `product.md` §6.1): ссылка на `#who`, дата только у пересказа. */
describe('EditorialByline', () => {
  it.each(SUPPORTED_LANGS)('%s: имя редакции - ссылка на /editorial-policy#who', (lang) => {
    const dict = getDictionary(lang).book;
    const { container } = render(
      <EditorialByline
        lang={lang}
        prefix={dict.editorialDescriptionBy}
        teamLabel={dict.editorialTeamBy}
      />
    );
    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe(`/${lang}/editorial-policy#who`);
    expect(link?.textContent).toBe(dict.editorialTeamBy);
    expect(container.textContent).toBe(`${dict.editorialDescriptionBy}${dict.editorialTeamBy}`);
  });

  it('с датой - через разделитель; без даты разделителя нет', () => {
    const withDate = render(
      <EditorialByline
        lang="ru"
        teamLabel="Редакция Bibliaris"
        dateText="Обновлено 13 октября 2026 г."
      />
    );
    expect(withDate.container.textContent).toBe(
      'Редакция Bibliaris · Обновлено 13 октября 2026 г.'
    );
    const noDate = render(<EditorialByline lang="ru" teamLabel="Редакция Bibliaris" />);
    expect(noDate.container.textContent).toBe('Редакция Bibliaris');
  });

  // F02-4, решение арбитра 16.10.2026 (`F02 | F02-4`, Р2): автор ведёт в `#authors`, книга — на `#who`.
  it('якорь: по умолчанию #who, страница автора — #authors', () => {
    const book = render(<EditorialByline lang="ru" teamLabel="Редакция Bibliaris" />);
    expect(book.container.querySelector('a')?.getAttribute('href')).toBe(
      '/ru/editorial-policy#who'
    );
    book.unmount();
    const author = render(
      <EditorialByline lang="ru" teamLabel="Редакция Bibliaris" anchor="authors" />
    );
    expect(author.container.querySelector('a')?.getAttribute('href')).toBe(
      '/ru/editorial-policy#authors'
    );
    author.unmount();
    // F03-3 (решение арбитра `F03 | F03-3`, В5): подпись анализа - на раздел об анализе.
    const analysis = render(
      <EditorialByline lang="ru" teamLabel="Редакция Bibliaris" anchor="analysis" />
    );
    expect(analysis.container.querySelector('a')?.getAttribute('href')).toBe(
      '/ru/editorial-policy#analysis'
    );
  });
});
