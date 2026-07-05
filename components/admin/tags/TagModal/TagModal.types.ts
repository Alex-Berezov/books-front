import { z } from 'zod';
import { type SupportedLang } from '@/lib/i18n/lang';
import type { Tag } from '@/types/api-schema';

export const tagSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  key: z
    .string()
    .min(1, 'Key is required')
    .regex(/^[a-z0-9-]+$/, 'Key must contain only lowercase letters, numbers, and hyphens'),
  indexable: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export type TagFormData = z.infer<typeof tagSchema>;

export interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  tag?: Tag; // If provided, we are in edit mode
  lang: SupportedLang;
}
