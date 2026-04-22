'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import {
  useAudioChapters,
  useBookVersion,
  useUpdateBook,
  useUpdateBookVersion,
  useUpsertVersionSeo,
} from '@/api/hooks';
import type { BookFormData, TabType } from '@/components/admin/books';
import type { ApiError } from '@/types/api';
import type { UpdateBookVersionRequest } from '@/types/api-schema';

export const useBookVersionLogic = (versionId: string) => {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  // Active tab state
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Load version data
  const { data: version, error, isLoading, refetch } = useBookVersion(versionId);

  // For audio versions, fetch chapters to validate publish-readiness.
  const isAudioVersion = version?.type === 'audio';
  const { data: audioChaptersData } = useAudioChapters(versionId, undefined, {
    enabled: isAudioVersion,
  });
  const audioChaptersCount = audioChaptersData?.items.length ?? 0;

  // Publish is blocked when an audio version has no audio chapters yet.
  const publishBlockedReason =
    isAudioVersion && audioChaptersCount === 0
      ? 'Add at least one audio chapter before publishing this audio version.'
      : null;

  // Mutation for updating version
  const updateMutation = useUpdateBookVersion({
    onSuccess: () => {
      enqueueSnackbar('Book version updated successfully', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to update book version: ${error.message}`, { variant: 'error' });
    },
  });

  // Mutation for updating SEO
  const seoMutation = useUpsertVersionSeo({
    onSuccess: () => {
      enqueueSnackbar('SEO metadata updated successfully', { variant: 'success' });
    },
    onError: (error: ApiError) => {
      enqueueSnackbar(`Failed to update SEO: ${error.message}`, { variant: 'error' });
    },
  });

  // Mutation for updating book (e.g., slug)
  const updateBookMutation = useUpdateBook({
    onSuccess: () => {
      enqueueSnackbar('Book slug updated successfully', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to update book slug: ${error.message}`, { variant: 'error' });
    },
  });

  /**
   * Successful publish handler
   */
  const handlePublishSuccess = () => {
    enqueueSnackbar('Version published successfully', { variant: 'success' });
  };

  /**
   * Successful unpublish handler
   */
  const handleUnpublishSuccess = () => {
    enqueueSnackbar('Version unpublished successfully', { variant: 'success' });
  };

  /**
   * Categories change handler
   */
  const handleCategoriesChange = () => {
    refetch();
    // enqueueSnackbar('Categories updated successfully', { variant: 'success' });
  };

  /**
   * Tags change handler
   */
  const handleTagsChange = () => {
    refetch();
    // enqueueSnackbar('Tags updated successfully', { variant: 'success' });
  };

  /**
   * Form submission handler
   */
  const handleSubmit = async (formData: BookFormData) => {
    // Check if slug has changed
    const slugChanged = version && formData.bookSlug !== version.bookSlug;

    // If slug changed, update book first
    if (slugChanged && version) {
      try {
        await updateBookMutation.mutateAsync({
          bookId: version.bookId,
          data: { slug: formData.bookSlug },
        });
      } catch (error) {
        // Error already handled by mutation's onError callback
        // Don't proceed with version update if slug update failed
        return;
      }
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
    const requestData: UpdateBookVersionRequest = {
      title: formData.title,
      author: formData.author,
      description: formData.description || undefined,
      coverImageUrl: formData.coverImageUrl || undefined,
      type: formData.type,
      isFree: formData.isFree,
      referralUrl: formData.referralUrl || undefined,
    };

    // Send update request
    try {
      await updateMutation.mutateAsync({
        versionId,
        data: requestData,
      });

      // If SEO data exists, send it separately
      if (Object.keys(seoData).length > 0) {
        await seoMutation.mutateAsync({
          versionId,
          data: seoData,
        });
      }

      // Force refetch to get fresh data from backend
      const refetchResult = await refetch();

      // ⚠️ WARNING: Check if backend returned all SEO fields
      const sentFields = Object.keys(seoData);
      const receivedFields = Object.keys(refetchResult.data?.seo || {});
      const missingFields = sentFields.filter((field) => !receivedFields.includes(field));

      if (missingFields.length > 0) {
        console.warn(
          '⚠️ BACKEND ISSUE: Some SEO fields were not saved!',
          '\nSent fields:',
          sentFields,
          '\nReceived fields:',
          receivedFields,
          '\nMissing fields:',
          missingFields
        );
        enqueueSnackbar(
          `Warning: Backend did not save all SEO fields (${missingFields.length} missing)`,
          { variant: 'warning' }
        );
      }
    } catch (error) {
      console.error('❌ Error during submit:', error);
      // Errors are handled by mutation callbacks
    }
  };

  const isSubmitting =
    updateMutation.isPending || updateBookMutation.isPending || seoMutation.isPending;

  return {
    version,
    error,
    isLoading,
    activeTab,
    setActiveTab,
    isSubmitting,
    publishBlockedReason,
    handleSubmit,
    handlePublishSuccess,
    handleUnpublishSuccess,
    handleCategoriesChange,
    handleTagsChange,
    router,
  };
};
