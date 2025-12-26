import { z } from 'zod';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';

export const translationSchema = z.object({
  language: z.enum(SUPPORTED_LANGS),
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
});

export type TranslationFormData = z.infer<typeof translationSchema>;
