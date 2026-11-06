import type {
  BookVersionDetail,
  ChapterTitle,
  DossierData,
  DossierStatus,
} from '@/types/api-schema';

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
 * Сквозные мотивы готового досье версии (Р10 `F05 | F05-11`; с F07-3a — из `GET versions/:id/dossier`,
 * решение арбитра `F07 | F07-3`): символы в JSON импорта требуют толкования, поэтому мотивы идут
 * во «Вводные». Главы — только этой версии.
 */
export interface BookAnalysisPromptMotifs {
  motifs: readonly DossierData['motifs'][number][];
  /** Язык досье; не язык версии — строка заголовка его называет. */
  dossierLanguage: string | null;
}

/**
 * Мотивы для «Вводных» из ответа досье версии: только готовое досье (строящееся, упавшее и
 * отсутствующее мотивов не дают), главы мотивов — только номера глав этой версии, как `motifsOf`
 * снятой заготовки (`books`, `content-draft-tasks.handler.ts` до F07-3a). Список глав урезан
 * пределом ручки — номер после последнего показанного не проверить, он остаётся; глав в списке
 * нет — главы мотивов не остаются.
 * `dossierLanguage` неизвестен (`undefined`) — мотивов нет: без него чужой язык досье не пометить.
 */
export const promptMotifsFromDossier = (
  dossier: DossierStatus | undefined,
  chapters: readonly ChapterTitle[],
  chaptersTotal: number,
  dossierLanguage: string | undefined
): BookAnalysisPromptMotifs | null => {
  if (dossier?.status !== 'ready' || !dossier.data || dossierLanguage === undefined) return null;
  const numbers = new Set(chapters.map((c) => c.number));
  // Номер после последнего показанного не проверить, только если показан хоть один: пустой
  // список глав — проверять не по чему, главы мотивов отбрасываются.
  const lastShown =
    chapters.length > 0 && chapters.length < chaptersTotal
      ? chapters.reduce((max, c) => Math.max(max, c.number), -Infinity)
      : Infinity;
  const raw: unknown = dossier.data.motifs;
  const motifs = (Array.isArray(raw) ? (raw as unknown[]) : []).flatMap((m) => {
    const motif = m as Partial<DossierData['motifs'][number]> | null;
    if (!motif || typeof motif.image !== 'string') return [];
    const chapterList: unknown[] = Array.isArray(motif.chapters) ? motif.chapters : [];
    return [
      {
        image: motif.image,
        chapters: chapterList.filter(
          (n): n is number => typeof n === 'number' && (numbers.has(n) || n > lastShown)
        ),
      },
    ];
  });
  return { motifs, dossierLanguage };
};

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
