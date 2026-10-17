import type { BookVersionDetail, ChapterTitle } from '@/types/api-schema';

/**
 * Текст кнопки «Вводные для промпта» вкладки Analysis (F03-1, `product.md` §21 п.2): ровно раздел
 * «Вводные» промпта `books-app-docs/features/F03-book-analysis/prompts/book-analysis.md` —
 * заголовки те же. Язык текста — язык промпта (русский), а не язык админки.
 */

export type BookAnalysisPromptVersion = Pick<
  BookVersionDetail,
  'title' | 'author' | 'language' | 'firstPublishedYear' | 'characters' | 'quotes'
>;

export const buildAnalysisPromptInputsText = (
  version: BookAnalysisPromptVersion,
  chapters: readonly ChapterTitle[],
  chaptersTotal: number
): string => {
  const lines: string[] = [];

  lines.push('Книга (название этой версии):', version.title || 'не указано', '');
  lines.push('Автор:', version.author || 'не указан', '');
  lines.push('Язык версии:', version.language, '');
  lines.push(
    'Год первой публикации:',
    version.firstPublishedYear != null ? String(version.firstPublishedYear) : 'не указан',
    ''
  );

  lines.push('Главы этой версии (номер — название):');
  if (chapters.length === 0) lines.push('глав нет');
  for (const c of chapters) lines.push(`${c.number} — ${c.title}`);
  if (chaptersTotal > chapters.length) {
    lines.push(`(показано ${chapters.length} из ${chaptersTotal})`);
  }
  lines.push('');

  lines.push('Персонажи, уже заведённые в этой версии:');
  const characters = version.characters ?? [];
  if (characters.length === 0) lines.push('нет');
  for (const c of characters) {
    lines.push(c.description ? `- ${c.name} — ${c.description}` : `- ${c.name}`);
  }
  lines.push('');

  lines.push('Цитаты, уже заведённые в этой версии:');
  const quotes = version.quotes ?? [];
  if (quotes.length === 0) lines.push('нет');
  for (const q of quotes) lines.push(`- ${q.text}`);

  return lines.join('\n');
};
