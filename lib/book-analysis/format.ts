import type {
  BookAnalysisBlocks,
  BookAnalysisCharacter,
  BookAnalysisRole,
} from '@/types/api-schema';

/**
 * Чистые помощники отрисовки страницы анализа (F03): заполненность поля, абзацы, порядок героев,
 * цвет темы. Без зависимостей - их читает и серверная страница, и тесты (как `lib/author/`).
 */

/** Заполнено ли поле: после обрезки пробелов остался текст (правило ядра, `product.md` §2). */
export function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Абзацы простого текста блока (T3): делитель - пустая строка, пустые абзацы выброшены. */
export function splitParagraphs(text: string | null | undefined): string[] {
  return (text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

const ROLE_ORDER: Record<BookAnalysisRole, number> = { main: 0, secondary: 1, minor: 2 };

/** Герои: главные, затем второстепенные, затем эпизодические; внутри - порядок данных (§7). */
export function sortCharacters(characters: readonly BookAnalysisCharacter[]) {
  return characters
    .map((character, index) => ({ character, index }))
    .sort(
      (a, b) =>
        (ROLE_ORDER[a.character.role] ?? 3) - (ROLE_ORDER[b.character.role] ?? 3) ||
        a.index - b.index
    )
    .map(({ character }) => character);
}

/** Число цветов тем в палитре (`$color-analysis-themes` в `styles/tokens.scss`): по индексу темы (T8). */
export const THEME_COLOR_COUNT = 8;

/** Номер цвета темы - её порядок в данных, по кругу палитры: один на карточку и метки. */
export function themeColorIndex(themeIndex: number): number {
  return themeIndex % THEME_COLOR_COUNT;
}

/**
 * Какие разделы анализа выводятся (`product.md` §1.4: раздел без данных не выводится). Один
 * предикат на страницу анализа (оглавление и разделы) и на страницу книги (ссылки «Разбор»):
 * разойдутся - ссылка поведёт на якорь, которого на странице нет.
 */
export function analysisSectionFlags(
  analysis: Pick<
    BookAnalysisBlocks,
    | 'themes'
    | 'characters'
    | 'symbols'
    | 'keyQuotes'
    | 'titleMeaning'
    | 'endingMeaning'
    | 'context'
    | 'timeline'
    | 'style'
    | 'reception'
    | 'adaptations'
    | 'misreadings'
    | 'discussionQuestions'
    | 'faq'
    | 'sources'
  >
) {
  return {
    themes: (analysis.themes?.length ?? 0) > 0,
    characters: (analysis.characters?.length ?? 0) > 0,
    symbols: (analysis.symbols?.length ?? 0) > 0,
    keyQuotes: (analysis.keyQuotes?.length ?? 0) > 0,
    titleMeaning: hasText(analysis.titleMeaning),
    endingMeaning: hasText(analysis.endingMeaning),
    // Контекст (§13): текст или лента, а лента - только от трёх событий.
    context: hasText(analysis.context) || hasTimeline(analysis.timeline),
    // Элемент без текста не выводится (§1.4) - и раздел из одних таких элементов тоже.
    style: (analysis.style ?? []).some(isStyleItem),
    reception: hasText(analysis.reception),
    adaptations: (analysis.adaptations?.length ?? 0) > 0,
    misreadings: (analysis.misreadings?.length ?? 0) > 0,
    discussion: (analysis.discussionQuestions ?? []).some(hasText),
    faq: (analysis.faq ?? []).some(isFaqItem),
    sources: (analysis.sources ?? []).some(isSourceItem),
  };
}

/**
 * Выводится ли элемент блока: одно правило на флаг раздела и на сам список - разойдутся,
 * и над пустым списком останется заголовок с пунктом оглавления (§1.4).
 */
export function isStyleItem(item: { device: string }): boolean {
  return hasText(item.device);
}

export function isSourceItem(item: { title: string }): boolean {
  return hasText(item.title);
}

/** Вопрос FAQ выводится, только когда есть и вопрос, и ответ. */
export function isFaqItem(item: { question: string; answer: string }): boolean {
  return hasText(item.question) && hasText(item.answer);
}

/** Меньше скольких событий лента таймлайна не рисуется (`product.md` §13). */
const TIMELINE_MIN_EVENTS = 3;

export function hasTimeline(timeline: readonly unknown[] | null | undefined): boolean {
  return (timeline?.length ?? 0) >= TIMELINE_MIN_EVENTS;
}

/** Отрезок подряд идущих номеров глав: `from === to` - одна глава. */
export interface ChapterRange {
  from: number;
  to: number;
}

/**
 * Номера глав отрезками по возрастанию (текстовый дубль полосы темы, `product.md` §9):
 * `[9, 1, 3, 7, 8, 3]` - `1, 3, 7–9`. Повторы и порядок входа на результат не влияют.
 */
export function toChapterRanges(chapters: readonly number[]): ChapterRange[] {
  const sorted = [...new Set(chapters)].sort((a, b) => a - b);
  const ranges: ChapterRange[] = [];
  for (const n of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && n === last.to + 1) last.to = n;
    else ranges.push({ from: n, to: n });
  }
  return ranges;
}
