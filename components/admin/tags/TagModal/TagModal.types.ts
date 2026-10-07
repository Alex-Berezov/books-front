import { z } from 'zod';
import { type SupportedLang } from '@/lib/i18n/lang';
import { isSlugLengthAllowed } from '@/lib/utils/slug';
import type { Tag } from '@/types/api-schema';

/**
 * Схема формы тега.
 *
 * @param keptSlug - слаг редактируемой записи; на создании не задаётся, и предел длины слага
 *   действует всегда. На правке предел — только у изменённого слага (`isSlugLengthAllowed`):
 *   старый длинный слаг не запирает правку остальных полей (`LEGACY-437`).
 */
export const buildTagSchema = (keptSlug?: string) =>
  z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z
      .string()
      .min(1, 'Slug is required')
      .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
      .refine((slug) => isSlugLengthAllowed(slug, keptSlug), 'Slug is too long'),
    key: z
      .string()
      .min(1, 'Key is required')
      .regex(/^[a-z0-9-]+$/, 'Key must contain only lowercase letters, numbers, and hyphens'),
    indexable: z.boolean().optional(),
    isVisible: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  });

/** Схема создания: предел длины слага действует всегда. */
export const tagSchema = buildTagSchema();

export type TagFormData = z.infer<typeof tagSchema>;

export interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  tag?: Tag; // If provided, we are in edit mode
  lang: SupportedLang;
}
