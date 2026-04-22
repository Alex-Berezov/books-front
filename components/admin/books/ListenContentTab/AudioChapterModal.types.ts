import { z } from 'zod';
import type { AudioChapter } from '@/types/api-schema';

/**
 * Hard limits mirroring the backend validation (see FRONTEND_ITER2_CONTRACT.md §3).
 */
export const AUDIO_TITLE_MAX = 255;
export const AUDIO_DESCRIPTION_MAX = 5000;
export const AUDIO_DURATION_MAX = 86_400; // 24 h

export const audioChapterSchema = z.object({
  number: z
    .number({ error: 'Chapter number is required' })
    .int('Chapter number must be an integer')
    .min(1, 'Chapter number must be at least 1'),
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(AUDIO_TITLE_MAX, `Title must be ${AUDIO_TITLE_MAX} characters or fewer`),
  audioUrl: z
    .string()
    .trim()
    .min(1, 'Audio file is required')
    .url('Audio URL must be a valid http(s) URL')
    .refine(
      (value) => /^https?:\/\//i.test(value),
      'Audio URL must start with http:// or https://'
    ),
  mediaId: z.string().uuid().nullable().optional(),
  duration: z
    .number({ error: 'Duration is required' })
    .int('Duration must be in whole seconds')
    .min(0, 'Duration must be 0 or greater')
    .max(AUDIO_DURATION_MAX, `Duration must be ${AUDIO_DURATION_MAX} seconds or fewer`),
  description: z
    .string()
    .max(AUDIO_DESCRIPTION_MAX, `Description must be ${AUDIO_DESCRIPTION_MAX} characters or fewer`)
    .nullable()
    .optional(),
  transcript: z.string().nullable().optional(),
});

export type AudioChapterFormData = z.infer<typeof audioChapterSchema>;

export interface AudioChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AudioChapterFormData) => Promise<void>;
  initialData?: AudioChapter;
  isSubmitting?: boolean;
  nextChapterNumber?: number;
}
