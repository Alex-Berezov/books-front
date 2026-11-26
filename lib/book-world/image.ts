import type { BookWorldImage } from '@/types/api-schema';

/**
 * Типы сущностей с иллюстрацией (F08-12c-2): герой и место. Копия типовой половины `worldImageAllowed`
 * (`books/src/modules/book-world/world-image-public.ts`; роль героя сверяет бэкенд) — change both
 * together. Одна на страницу сущности и вкладку World.
 */
export const WORLD_IMAGE_TYPES = ['character', 'place'] as const;
export type WorldImageEntityType = (typeof WORLD_IMAGE_TYPES)[number];

/** Сущность этого типа может иметь иллюстрацию (пара, предмет, понятие, событие - нет). */
export const worldImageTypeAllowed = (type: string): type is WorldImageEntityType =>
  (WORLD_IMAGE_TYPES as readonly string[]).includes(type);

/**
 * Запасные размеры, если сервер не прочёл размеры файла: портрет 1:1 от 1200 px (`tech.md` §10),
 * место - кадр от 1200×675 (F08-12c-2; равен `WORLD_PLACE_IMAGE_FILE_LIMITS`, держит `__tests__/lib/book-world/image.test.ts`).
 * Одни на вкладку World и страницу сущности (F08-11c).
 */
const FALLBACK_PORTRAIT = { width: 1200, height: 1200 };
const FALLBACK_PLACE = { width: 1200, height: 675 };

/**
 * Размеры для `next/image`: из файла, если известны обе стороны, иначе запасные по типу сущности -
 * одна известная сторона с запасной второй дала бы пропорцию, которой у файла нет.
 */
export const worldImageSize = (
  { width, height }: Pick<BookWorldImage, 'width' | 'height'>,
  entityType?: string
): { width: number; height: number } =>
  width && height ? { width, height } : entityType === 'place' ? FALLBACK_PLACE : FALLBACK_PORTRAIT;
