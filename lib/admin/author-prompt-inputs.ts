import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import { getSiteUrl } from '@/lib/seo/urls';
import type { AuthorPromptInputs, AuthorPromptName } from '@/types/api-schema';

/**
 * Текст кнопки «Вводные для промпта» (F02-2): ровно раздел «Входные данные» промпта данных
 * автора (`books-app-docs/features/F02-author-page/prompts/author-data.md`) — заголовки
 * те же, строки книг «название — slug — год», авторов «имя — slug на каждом языке».
 * Язык текста — язык промпта (русский), а не язык админки.
 */

export const PROMPT_AUTHORS_TRUNCATED_NOTE =
  '(Список авторов неполный: на сайте их больше, чем поместилось. Слаг автора, которого нет в списке, не придумывай — ставь null.)';

const langOrder = (lang: string) => (SUPPORTED_LANGS as readonly string[]).indexOf(lang);

const byLang = <T extends { lang: string }>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => langOrder(a.lang) - langOrder(b.lang));

const datesLine = (birth: string | null, death: string | null): string => {
  if (!birth && !death) return 'не указаны';
  return `${birth || 'дата рождения не указана'} — ${death || 'дата смерти не указана'}`;
};

const namesLine = (names: readonly AuthorPromptName[]): string =>
  byLang(names)
    .map((n) => `${n.lang}: ${n.name} — ${n.slug}`)
    .join('; ');

export const buildPromptInputsText = (inputs: AuthorPromptInputs): string => {
  const lines: string[] = [];

  lines.push('Имя автора:');
  lines.push(
    ...(inputs.names.length
      ? byLang(inputs.names).map((n) => `${n.lang}: ${n.name}`)
      : ['не указано'])
  );
  lines.push('');

  lines.push('Даты жизни (если известны):');
  lines.push(datesLine(inputs.birthDate, inputs.deathDate));
  lines.push('');

  lines.push('Книги этого автора на Bibliaris (по языкам: название — slug — год):');
  const books = byLang(inputs.books);
  if (books.length === 0) lines.push('книг на сайте нет');
  for (const group of books) {
    lines.push(`${group.lang}:`);
    if (group.items.length === 0) lines.push('- книг на этом языке нет');
    for (const book of group.items) {
      const parts = [book.title, book.slug];
      if (book.firstPublishedYear !== null) parts.push(String(book.firstPublishedYear));
      lines.push(`- ${parts.join(' — ')}`);
    }
    if (group.total > group.items.length) {
      lines.push(`(показано ${group.items.length} из ${group.total})`);
    }
  }
  lines.push('');

  lines.push('Авторы на Bibliaris (имя — slug на каждом языке):');
  const authors = inputs.authors.filter((a) => a.names.length > 0);
  if (authors.length === 0) lines.push('авторов на сайте нет');
  for (const author of authors) lines.push(`- ${namesLine(author.names)}`);
  if (inputs.authorsTruncated) lines.push(PROMPT_AUTHORS_TRUNCATED_NOTE);
  lines.push('');

  lines.push('Базовый домен:');
  lines.push(getSiteUrl());

  return lines.join('\n');
};
