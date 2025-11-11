'use client';

import type { FC } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCreateBookVersion } from '@/api/hooks';
import { BookForm } from '@/components/admin/books';
import type { BookFormData } from '@/components/admin/books';
import type { SupportedLang } from '@/lib/i18n/lang';
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
 */
const NewBookVersionPage: FC<NewBookVersionPageProps> = (props) => {
  const { params } = props;
  const { lang } = params;

  // Navigation hooks
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get bookId from query parameters
  const bookId = searchParams.get('bookId');

  // Mutation for creating version
  const createMutation = useCreateBookVersion({
    onSuccess: (data) => {
      // Redirect to created version edit page
      router.push(`/admin/${lang}/books/versions/${data.id}`);
    },
    onError: (error) => {
      // TODO: Show toast notification about error
      console.error('Failed to create book version:', error);
    },
  });

  /**
   * Form submission handler
   */
  const handleSubmit = async (formData: BookFormData) => {
    // Check that bookId is present
    if (!bookId) {
      console.error('bookId is required');
      return;
    }

    // Convert form data to API format
    const requestData: CreateBookVersionRequest = {
      language: formData.language,
      title: formData.title,
      author: formData.author,
      description: formData.description,
      coverImageUrl: formData.coverImageUrl,
      type: formData.type,
      isFree: formData.isFree,
      referralUrl: formData.referralUrl || undefined,
      seoMetaTitle: formData.seoMetaTitle || undefined,
      seoMetaDescription: formData.seoMetaDescription || undefined,
    };

    // Send creation request
    createMutation.mutate({
      bookId,
      data: requestData,
    });
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
        isSubmitting={createMutation.isPending}
        lang={lang}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default NewBookVersionPage;
