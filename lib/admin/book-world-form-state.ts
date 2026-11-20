import type { BookWorldListKey, BookWorldTextKey } from '@/lib/admin/book-world-blocks';
import type { BookWorldEntity, BookWorldRole } from '@/types/api-schema';

/**
 * Форма карточки героя (F08-1) без `zod`: тексты — полями, списки — JSON-текстом, формы имени —
 * по строке на форму. Проверку и сборку тела записи делает ленивый `book-world-validation.ts`.
 */
export interface WorldEntityFormValues {
  key: string;
  name: string;
  role: BookWorldRole | '';
  /** Формы имени, по одной на строку. */
  aliases: string;
  /** Исключённые из подсчёта формы (F08-2), по одной на строку. */
  aliasExclusions: string;
  /**
   * Исключения пришли с сервером (или сущность новая): только тогда пустое поле — «очистить».
   * Иначе поле не уходит вовсе, чтобы не стереть сохранённые исключения, которых форма не видела.
   */
  aliasExclusionsKnown: boolean;
  /** Исключённые главы у формы (F08-8a): строка на форму, `форма: 3, 15`. */
  aliasChapterExclusions: string;
  /** Как `aliasExclusionsKnown`: поле пришло с сервером или сущность новая. */
  aliasChapterExclusionsKnown: boolean;
  texts: Record<BookWorldTextKey, string>;
  /** JSON-текст списков; пусто — списка нет. */
  lists: Record<BookWorldListKey, string>;
}

const json = (value: unknown): string =>
  Array.isArray(value) && value.length > 0 ? JSON.stringify(value, null, 2) : '';

export const formFromWorldEntity = (entity: BookWorldEntity | null): WorldEntityFormValues => ({
  key: entity?.key ?? '',
  name: entity?.name ?? '',
  role: entity?.role ?? '',
  aliases: (entity?.aliases ?? []).join('\n'),
  aliasExclusions: (entity?.editor?.aliasExclusions ?? []).join('\n'),
  aliasExclusionsKnown: entity === null || entity.editor?.aliasExclusions !== undefined,
  aliasChapterExclusions: (entity?.editor?.aliasChapterExclusions ?? [])
    .map((e) => `${e.form}: ${e.chapters.join(', ')}`)
    .join('\n'),
  aliasChapterExclusionsKnown:
    entity === null || entity.editor?.aliasChapterExclusions !== undefined,
  texts: {
    short: entity?.short ?? '',
    position: entity?.profile?.position ?? '',
    relationToMain: entity?.profile?.relationToMain ?? '',
    appearance: entity?.appearance ?? '',
    character: entity?.character ?? '',
    arcFrom: entity?.arc?.from ?? '',
    arcTo: entity?.arc?.to ?? '',
    critique: entity?.critique ?? '',
    prototypes: entity?.prototypes ?? '',
    bonds: entity?.bonds ?? '',
    differences: entity?.differences ?? '',
    conclusion: entity?.conclusion ?? '',
  },
  lists: {
    stages: json(entity?.arc?.stages),
    scenes: json(entity?.scenes),
    relations: json(entity?.relations),
    compare: json(entity?.compare),
    quotes: json(entity?.quotes),
    adaptations: json(entity?.adaptations),
    faq: json(entity?.faq),
    sources: json(entity?.sources),
  },
});
