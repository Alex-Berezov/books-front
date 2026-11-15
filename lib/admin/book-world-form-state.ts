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
  },
  lists: {
    stages: json(entity?.arc?.stages),
    scenes: json(entity?.scenes),
    relations: json(entity?.relations),
    quotes: json(entity?.quotes),
    adaptations: json(entity?.adaptations),
    faq: json(entity?.faq),
    sources: json(entity?.sources),
  },
});
