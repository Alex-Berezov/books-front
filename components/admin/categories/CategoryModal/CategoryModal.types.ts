import { z } from 'zod';
import type { Category } from '@/types/api-schema';

export const CATEGORY_TYPES = ['genre', 'author', 'popular'] as const;

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  parentId: z.string().nullable().optional(),
  type: z.enum(CATEGORY_TYPES, {
    message: 'Please select a valid type',
  }),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

export interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Category; // If provided, it's edit mode
}
