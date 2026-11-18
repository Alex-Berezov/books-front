import {
  buildEditionNotesRows,
  type EditionNotesInput,
} from '@/components/public/books/EditionNotes/editionNotesRows';
import { hasText } from '@/lib/book-analysis/format';
import type { FactRow } from './AnalysisBlocks';
import type { AnalysisStrings } from '@/lib/i18n/analysisStrings';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { BookAnalysisDetail } from '@/types/api-schema';

/**
 * Строки карточки произведения (§4): порядок строк - как в спецификации; год первой публикации и язык
 * оригинала - из данных версии (то же правило, что блок «Об издании»), остальное - из анализа.
 * Пустые строки выброшены; рассказчик и место действия - со ссылками на героев (Q13).
 */
export function buildAnalysisFactRows(
  analysis: BookAnalysisDetail,
  edition: EditionNotesInput,
  t: Dictionary['book'],
  analysisT: AnalysisStrings
): FactRow[] {
  const facts = analysis.facts ?? {};
  const editionRows = buildEditionNotesRows(edition, {
    firstPublished: t.editionFirstPublished,
    originalLanguage: t.editionOriginalLanguage,
    originalTitle: t.editionOriginalTitle,
    translator: t.editionTranslator,
  });
  const editionValue = (label: string) => editionRows.find((r) => r.label === label)?.value;
  return [
    { label: t.summaryGenre, value: facts.genre },
    { label: analysisT.analysisFactMovement, value: facts.movement },
    { label: analysisT.analysisFactWrittenYears, value: facts.writtenYears },
    { label: t.editionFirstPublished, value: editionValue(t.editionFirstPublished) },
    { label: analysisT.analysisFactSettingPlace, value: facts.settingPlace, linked: true },
    { label: analysisT.analysisFactSettingTime, value: facts.settingTime },
    { label: analysisT.analysisFactNarrator, value: facts.narrator, linked: true },
    { label: analysisT.analysisFactStructure, value: facts.structure },
    { label: t.editionOriginalLanguage, value: editionValue(t.editionOriginalLanguage) },
  ].filter((row): row is FactRow => hasText(row.value));
}
