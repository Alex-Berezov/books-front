import { z } from 'zod';
import type { Category } from '@/types/api-schema';

export type CategoryType = 'category' | 'genre' | 'collection';

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  key: z
    .string()
    .min(1, 'Key is required')
    .regex(/^[a-z0-9-]+$/, 'Key must contain only lowercase letters, numbers, and hyphens'),
  parentId: z.string().nullable().optional(),
  type: z.enum(['category', 'genre', 'collection']),
  // Оба поля — вето: они умеют закрыть термин и не умеют открыть. Открытие
  // решает автоматическое правило по числу книг языка (гистерезис). Подписи в
  // форме обязаны говорить именно это, иначе редактор будет ждать от галочки
  // гарантии, которой у неё нет.
  indexable: z.boolean().optional(),
  isVisible: z.boolean().optional(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

export interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Category; // If provided, it's edit mode
  initialParentId?: string | null;
  type: CategoryType; // Determines the type and filters parent options
}
