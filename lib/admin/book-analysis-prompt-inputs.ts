import type { BookVersionDetail, ChapterTitle, ContentDraftMotif } from '@/types/api-schema';

/**
 * Текст кнопки «Вводные для промпта» вкладки Analysis (F03-1, `product.md` §21 п.2): ровно раздел
 * «Вводные» промпта `books-app-docs/features/F03-book-analysis/prompts/book-analysis.md` —
 * заголовки те же. Язык текста — язык промпта (русский), а не язык админки.
 */

export type BookAnalysisPromptVersion = Pick<
  BookVersionDetail,
  'title' | 'author' | 'language' | 'firstPublishedYear' | 'characters' | 'quotes'
>;

/**
 * Сквозные мотивы досье из готовой заготовки Analysis (F05-11, решение арбитра `F05 | F05-11`,
 * Р10): символы в JSON импорта требуют толкования, поэтому мотивы идут во «Вводные».
 */
export interface BookAnalysisPromptMotifs {
  motifs: readonly ContentDraftMotif[];
  /** Язык досье; не язык версии — строка заголовка его называет. */
  dossierLanguage: string | null;
}

export const buildAnalysisPromptInputsText = (
  version: BookAnalysisPromptVersion,
  chapters: readonly ChapterTitle[],
  chaptersTotal: number,
  motifs: BookAnalysisPromptMotifs | null = null
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

  if (motifs) {
    lines.push('');
    const foreign = motifs.dossierLanguage && motifs.dossierLanguage !== version.language;
    lines.push(
      foreign
        ? `Сквозные мотивы из досье (язык досье: ${motifs.dossierLanguage}):`
        : 'Сквозные мотивы из досье:'
    );
    if (motifs.motifs.length === 0) lines.push('нет');
    for (const m of motifs.motifs) {
      lines.push(
        m.chapters.length > 0 ? `- ${m.image} — главы ${m.chapters.join(', ')}` : `- ${m.image}`
      );
    }
  }

  return lines.join('\n');
};
