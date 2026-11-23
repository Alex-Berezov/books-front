import type { BookWorldImage } from '@/types/api-schema';

/**
 * Сторона портрета, если сервер не прочёл размеры файла: портрет 1:1 от 1200 px (`tech.md` §10).
 * Одна на вкладку World и страницу героя (F08-11c).
 */
const WORLD_IMAGE_FALLBACK_SIDE = 1200;

/**
 * Размеры для `next/image`: из файла, если известны обе стороны, иначе квадрат запасной стороны -
 * одна известная сторона с запасной второй дала бы пропорцию, которой у файла нет.
 */
export const worldImageSize = ({
  width,
  height,
}: Pick<BookWorldImage, 'width' | 'height'>): { width: number; height: number } =>
  width && height
    ? { width, height }
    : { width: WORLD_IMAGE_FALLBACK_SIDE, height: WORLD_IMAGE_FALLBACK_SIDE };
