import { z } from 'zod';
import type { Category } from '@/types/api-schema';

export type CategoryType = 'category' | 'genre' | 'collection';

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  parentId: z.string().nullable().optional(),
  type: z.enum(['category', 'genre', 'collection']),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

export interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Category; // If provided, it's edit mode
  initialParentId?: string | null;
  type: CategoryType; // Determines the type and filters parent options
}
