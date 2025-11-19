'use client';

import type { FC } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useCreateBookVersion, useUpsertVersionSeo } from '@/api/hooks';
import { BookForm } from '@/components/admin/books';
import type { BookFormData } from '@/components/admin/books';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { ApiError } from '@/types/api';
import type { CreateBookVersionRequest } from '@/types/api-schema';
import styles from './page.module.scss';

interface NewBookVersionPageProps {
  params: {
    lang: SupportedLang;
  };
}

/**
 * New book version creation page
 *
 * Displays form for creating new version (language, title, author, etc.)
 * Can accept pre-filled title and author from URL params
 */
const NewBookVersionPage: FC<NewBookVersionPageProps> = (props) => {
  const { params } = props;
  const { lang } = params;

  // Navigation hooks
  const router = useRouter();
  const searchParams = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();

  // Get data from query parameters
  const bookId = searchParams.get('bookId');
  const titleFromUrl = searchParams.get('title');
  const authorFromUrl = searchParams.get('author');

  // Mutation for creating version
  const createMutation = useCreateBookVersion({
    onSuccess: (data) => {
      enqueueSnackbar('Book version created successfully', { variant: 'success' });
      // Redirect to created version edit page
      router.push(`/admin/${lang}/books/versions/${data.id}`);
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to create book version: ${error.message}`, { variant: 'error' });
    },
  });

  // Mutation for creating SEO
  const seoMutation = useUpsertVersionSeo({
    onSuccess: () => {
      enqueueSnackbar('SEO metadata saved successfully', { variant: 'success' });
    },
    onError: (error: ApiError) => {
      enqueueSnackbar(`Failed to save SEO: ${error.message}`, { variant: 'error' });
    },
  });

  /**
   * Form submission handler
   */
  const handleSubmit = async (formData: BookFormData) => {
    // Check that bookId is present
    if (!bookId) {
      enqueueSnackbar('Missing bookId parameter', { variant: 'error' });
      return;
    }

    // Build SEO object only if at least one field is filled
    const seoData: Record<string, string> = {};
    if (formData.seoMetaTitle) seoData.metaTitle = formData.seoMetaTitle;
    if (formData.seoMetaDescription) seoData.metaDescription = formData.seoMetaDescription;
    if (formData.seoCanonicalUrl) seoData.canonicalUrl = formData.seoCanonicalUrl;
    if (formData.seoRobots) seoData.robots = formData.seoRobots;
    if (formData.seoOgTitle) seoData.ogTitle = formData.seoOgTitle;
    if (formData.seoOgDescription) seoData.ogDescription = formData.seoOgDescription;
    if (formData.seoOgImageUrl) seoData.ogImageUrl = formData.seoOgImageUrl;
    if (formData.seoTwitterCard) seoData.twitterCard = formData.seoTwitterCard;

    // Convert form data to API format (without SEO)
    const requestData: CreateBookVersionRequest = {
      language: formData.language,
      title: formData.title,
      author: formData.author,
      description: formData.description,
      coverImageUrl: formData.coverImageUrl,
      type: formData.type,
      isFree: formData.isFree,
      referralUrl: formData.referralUrl || undefined,
    };

    // Send creation request
    try {
      const createdVersion = await createMutation.mutateAsync({
        bookId,
        data: requestData,
      });

      // If SEO data exists, send it separately
      if (Object.keys(seoData).length > 0) {
        await seoMutation.mutateAsync({
          versionId: createdVersion.id,
          data: seoData,
        });
      }
    } catch (error) {
      // Errors are handled by mutation callbacks
    }
  };

  // If no bookId, show error
  if (!bookId) {
    return (
      <div className={styles.errorContainer}>
        <h1 className={styles.errorTitle}>Error: Missing bookId</h1>
        <p className={styles.errorMessage}>
          Please provide a bookId query parameter to create a new version.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Create New Book Version</h1>
      <BookForm
        bookId={bookId}
        initialTitle={titleFromUrl || undefined}
        initialAuthor={authorFromUrl || undefined}
        isSubmitting={createMutation.isPending || seoMutation.isPending}
        lang={lang}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default NewBookVersionPage;
