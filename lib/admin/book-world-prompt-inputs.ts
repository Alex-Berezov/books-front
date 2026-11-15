import type {
  BookAnalysisCharacter,
  BookVersionDetail,
  ChapterTitle,
  DossierData,
  DossierStatus,
} from '@/types/api-schema';

/**
 * Текст кнопки «Вводные для промпта» вкладки World (F08-1, `product.md` §17 п.5): название,
 * автор, язык, главы «номер — название», герои анализа, герои и сущности досье с вариантами
 * имён — ровно раздел «Вводные» промпта `books-app-docs/features/F08-book-wiki/prompts/world-character.md`,
 * заголовки те же. Язык текста — язык промпта (русский), а не язык админки. Ключи идут в текст: связи и
 * `speakerKey` JSON мира ссылаются на ключи сущностей и героев анализа.
 */

export type BookWorldPromptVersion = Pick<BookVersionDetail, 'title' | 'author' | 'language'>;

/** Герои и сущности досье для «Вводных»; досье только у `admin` (как мотивы анализа). */
export interface BookWorldPromptDossier {
  characters: readonly Pick<DossierData['characters'][number], 'key' | 'name' | 'variants'>[];
  entities: readonly Pick<DossierData['entities'][number], 'key' | 'name'>[];
  /** Язык досье; не язык версии — строка заголовка его называет. */
  dossierLanguage: string | null;
}

/**
 * Досье для «Вводных» из ответа досье версии: только готовое досье; строящееся, упавшее и
 * отсутствующее не дают ничего. Записи без строкового ключа и имени отбрасываются.
 * `dossierLanguage` неизвестен (`undefined`) — досье нет: без него чужой язык не пометить.
 */
export const promptDossierFromStatus = (
  dossier: DossierStatus | undefined,
  dossierLanguage: string | undefined
): BookWorldPromptDossier | null => {
  if (dossier?.status !== 'ready' || !dossier.data || dossierLanguage === undefined) return null;
  const raw = dossier.data as Partial<DossierData>;
  const characters = (Array.isArray(raw.characters) ? raw.characters : []).flatMap((c) =>
    c && typeof c.key === 'string' && typeof c.name === 'string'
      ? [
          {
            key: c.key,
            name: c.name,
            variants: Array.isArray(c.variants)
              ? c.variants.filter((v): v is string => typeof v === 'string')
              : [],
          },
        ]
      : []
  );
  const entities = (Array.isArray(raw.entities) ? raw.entities : []).flatMap((e) =>
    e && typeof e.key === 'string' && typeof e.name === 'string'
      ? [{ key: e.key, name: e.name }]
      : []
  );
  return { characters, entities, dossierLanguage };
};

export const buildWorldPromptInputsText = (
  version: BookWorldPromptVersion,
  chapters: readonly ChapterTitle[],
  chaptersTotal: number,
  /** `null` — анализа нет («нет»); `undefined` — не загрузился, раздела нет вовсе. */
  analysisCharacters: readonly BookAnalysisCharacter[] | null | undefined,
  dossier: BookWorldPromptDossier | null = null
): string => {
  const lines: string[] = [];

  lines.push('Книга (название этой версии):', version.title || 'не указано', '');
  lines.push('Автор:', version.author || 'не указан', '');
  lines.push('Язык версии:', version.language, '');

  lines.push('Главы этой версии (номер — название):');
  if (chapters.length === 0) lines.push('глав нет');
  for (const c of chapters) lines.push(`${c.number} — ${c.title}`);
  if (chaptersTotal > chapters.length) {
    lines.push(`(показано ${chapters.length} из ${chaptersTotal})`);
  }
  lines.push('');

  if (analysisCharacters !== undefined) {
    lines.push('Герои анализа этой версии (ключ — имя — роль):');
    const heroes = analysisCharacters ?? [];
    if (heroes.length === 0) lines.push('нет');
    for (const h of heroes) lines.push(`${h.key} — ${h.name} — ${h.role}`);
  }

  // Досье нет (не `admin`, не готово) — раздела нет вовсе: «нет» сказало бы модели, что в книге
  // нет героев. Пустое готовое досье — «нет», как в промпте.
  if (dossier) {
    const foreign = dossier.dossierLanguage && dossier.dossierLanguage !== version.language;
    lines.push('');
    lines.push(
      foreign
        ? `Герои и сущности досье (ключ — имя — варианты имени; язык досье: ${dossier.dossierLanguage}):`
        : 'Герои и сущности досье (ключ — имя — варианты имени):'
    );
    if (dossier.characters.length === 0 && dossier.entities.length === 0) lines.push('нет');
    for (const c of dossier.characters) {
      lines.push(
        c.variants.length > 0
          ? `${c.key} — ${c.name} — ${c.variants.join(', ')}`
          : `${c.key} — ${c.name}`
      );
    }
    for (const e of dossier.entities) lines.push(`${e.key} — ${e.name}`);
  }

  return lines.join('\n');
};
