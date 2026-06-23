import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookVersionDetail } from '@/types/api-schema';
import { type BookFormData, bookVersionSchema } from './BookForm.types';

interface UseBookFormProps {
  lang: SupportedLang;
  initialData?: BookVersionDetail;
  initialTitle?: string;
  initialAuthor?: string;
}

export const useBookForm = (props: UseBookFormProps) => {
  const { lang, initialData, initialTitle, initialAuthor } = props;

  const form = useForm<BookFormData>({
    resolver: zodResolver(bookVersionSchema) as unknown as Resolver<BookFormData>,
    defaultValues: initialData
      ? {
          bookSlug: initialData.bookSlug || '',
          author: initialData.author,
          coverImageUrl: initialData.coverImageUrl || '',
          description: initialData.description || '',
          isFree: initialData.isFree,
          language: initialData.language,
          referralUrl: initialData.referralUrl || '',
          primaryCategoryId: initialData.primaryCategoryId || '',
          firstPublishedYear: initialData.firstPublishedYear ?? '',
          editionPublishedYear: initialData.editionPublishedYear ?? '',
          seoMetaTitle: initialData.seo?.metaTitle || '',
          seoMetaDescription: initialData.seo?.metaDescription || '',
          seoCanonicalUrl: initialData.seo?.canonicalUrl || '',
          seoRobots: initialData.seo?.robots || 'index, follow',
          seoOgTitle: initialData.seo?.ogTitle || '',
          seoOgDescription: initialData.seo?.ogDescription || '',
          seoOgImageUrl: initialData.seo?.ogImageUrl || '',
          seoTwitterCard:
            (initialData.seo?.twitterCard as 'summary' | 'summary_large_image') || 'summary',
          title: initialData.title,
          type: initialData.type,
          originalLanguage: initialData.originalLanguage || '',
          copyrightStatus: initialData.copyrightStatus || '',
          authorPageUrl: initialData.authorPageUrl || '',
          authorId: initialData.authorId || '',
          characters: initialData.characters || [],
          quotes: initialData.quotes || [],
          faq: initialData.faq || [],
          themes: initialData.themes || [],
          originalTitle: initialData.originalTitle || '',
          alternativeTitles: initialData.alternativeTitles || [],
          shortDescription: initialData.shortDescription || '',
          summaryShort: initialData.summaryShort || '',
          symbols: initialData.symbols || [],
          coverAlt: initialData.coverAlt || '',
          seoOgImageAlt: initialData.seo?.ogImageAlt || '',
        }
      : {
          bookSlug: '',
          author: initialAuthor || '',
          coverImageUrl: '',
          description: '',
          isFree: true,
          language: lang,
          referralUrl: '',
          primaryCategoryId: '',
          firstPublishedYear: '',
          editionPublishedYear: '',
          seoMetaTitle: '',
          seoMetaDescription: '',
          seoCanonicalUrl: '',
          seoRobots: 'index, follow',
          seoOgTitle: '',
          seoOgDescription: '',
          seoOgImageUrl: '',
          seoTwitterCard: 'summary',
          title: initialTitle || '',
          type: 'text' as const,
          originalLanguage: '',
          copyrightStatus: '',
          authorPageUrl: '',
          authorId: '',
          characters: [],
          quotes: [],
          faq: [],
          themes: [],
          originalTitle: '',
          alternativeTitles: [],
          shortDescription: '',
          summaryShort: '',
          symbols: [],
          coverAlt: '',
          seoOgImageAlt: '',
        },
  });

  const { reset, watch, setValue } = form;

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset({
        bookSlug: initialData.bookSlug || '',
        author: initialData.author,
        coverImageUrl: initialData.coverImageUrl || '',
        description: initialData.description || '',
        isFree: initialData.isFree,
        language: initialData.language,
        referralUrl: initialData.referralUrl || '',
        primaryCategoryId: initialData.primaryCategoryId || '',
        firstPublishedYear: initialData.firstPublishedYear ?? '',
        editionPublishedYear: initialData.editionPublishedYear ?? '',
        seoMetaTitle: initialData.seo?.metaTitle || '',
        seoMetaDescription: initialData.seo?.metaDescription || '',
        seoCanonicalUrl: initialData.seo?.canonicalUrl || '',
        seoRobots: initialData.seo?.robots || 'index, follow',
        seoOgTitle: initialData.seo?.ogTitle || '',
        seoOgDescription: initialData.seo?.ogDescription || '',
        seoOgImageUrl: initialData.seo?.ogImageUrl || '',
        seoTwitterCard:
          (initialData.seo?.twitterCard as 'summary' | 'summary_large_image') || 'summary',
        title: initialData.title,
        type: initialData.type,
        originalLanguage: initialData.originalLanguage || '',
        copyrightStatus: initialData.copyrightStatus || '',
        authorPageUrl: initialData.authorPageUrl || '',
        authorId: initialData.authorId || '',
        characters: initialData.characters || [],
        quotes: initialData.quotes || [],
        faq: initialData.faq || [],
        themes: initialData.themes || [],
        originalTitle: initialData.originalTitle || '',
        alternativeTitles: initialData.alternativeTitles || [],
        shortDescription: initialData.shortDescription || '',
        summaryShort: initialData.summaryShort || '',
        symbols: initialData.symbols || [],
        coverAlt: initialData.coverAlt || '',
        seoOgImageAlt: initialData.seo?.ogImageAlt || '',
      });
    }
  }, [initialData, reset]);

  // Auto-fill OG and Twitter fields when entering Meta Title and Meta Description
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      // Auto-fill on Meta Title input
      if (name === 'seoMetaTitle') {
        const newTitle = value.seoMetaTitle || '';
        // Always sync OG Title with Meta Title
        setValue('seoOgTitle', newTitle, { shouldValidate: false, shouldDirty: false });
      }

      // Auto-fill on Meta Description input
      if (name === 'seoMetaDescription') {
        const newDescription = value.seoMetaDescription || '';
        // Always sync OG Description with Meta Description
        setValue('seoOgDescription', newDescription, { shouldValidate: false, shouldDirty: false });
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, setValue]);

  return form;
};
