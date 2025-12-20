import { z } from 'zod';
import type { Chapter } from '@/types/api-schema';

export interface ChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ChapterFormData) => Promise<void>;
  initialData?: Chapter;
  isSubmitting?: boolean;
  nextChapterNumber?: number;
}

export const chapterSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().optional(),
  number: z.number().int().min(1, 'Chapter number must be at least 1'),
});

export type ChapterFormData = z.infer<typeof chapterSchema>;
