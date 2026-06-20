'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { getBook } from '@/api/endpoints/admin/books';
import {
  useAudioChapters,
  useBookVersion,
  useUpdateBook,
  useUpdateBookVersion,
  useUpsertVersionSeo,
  useCreateBookVersion,
} from '@/api/hooks';
import type { BookFormData, TabType } from '@/components/admin/books';
import type { ApiError } from '@/types/api';
import type { UpdateBookVersionRequest, CreateBookVersionRequest } from '@/types/api-schema';

export const useBookVersionLogic = (versionId: string) => {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  // Active tab state
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isImporting, setIsImporting] = useState(false);

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

  // Mutation for creating new language versions
  const createVersionMutation = useCreateBookVersion();

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
  };

  /**
   * Tags change handler
   */
  const handleTagsChange = () => {
    refetch();
  };

  /**
   * Import book data for 5 languages from ChatGPT JSON
   */
  const handleImportJson = async (jsonDataString: string) => {
    if (!version) return;
    setIsImporting(true);

    try {
      const data = JSON.parse(jsonDataString);
      const bookId = version.bookId;

      // Extract global details
      const globalData = {
        originalTitle: data.originalTitle || null,
        firstPublishedYear: data.firstPublishedYear ? Number(data.firstPublishedYear) : null,
        editionPublishedYear: data.editionPublishedYear ? Number(data.editionPublishedYear) : null,
        originalLanguage: data.originalLanguage || null,
      };

      // We need to fetch the existing versions of this book first to see what languages are already created
      // We can query the main book container endpoint or check version switcher data
      const bookContainer = await getBook(bookId);
      const existingVersions = bookContainer.versions || [];

      // We iterate over the translations (up to 5 languages: en, ru, es, pt, fr)
      const targetLanguages = ['en', 'ru', 'es', 'pt', 'fr'];
      const translations = data.translations || {};

      for (const langKey of targetLanguages) {
        const trans = translations[langKey];
        if (!trans) continue;

        // Check if version with this language already exists
        interface ExistingVersionItem {
          id: string;
          language?: string;
        }
        const matchedVersion = existingVersions.find(
          (v: ExistingVersionItem) => v.language === langKey
        );

        const versionPayload = {
          title: trans.localizedTitle || version.title,
          author: trans.localizedAuthorName || version.author,
          description: trans.shortDescription || version.description || '',
          coverImageUrl: version.coverImageUrl || '',
          type: version.type,
          isFree: version.isFree,
          primaryCategoryId: version.primaryCategoryId || null,
          copyrightStatus: trans.copyrightStatusSuggestion || version.copyrightStatus || null,
          alternativeTitles: trans.alternativeTitles || null,
          shortDescription: trans.shortDescription || null,
          summaryShort: trans.summaryShort || null,
          symbols: trans.symbols || null,
          coverAlt: trans.coverAlt || null,
          characters: trans.characters || null,
          quotes: trans.quotes || null,
          faq: trans.faq || null,
          themes: trans.themes || null,
          ...globalData,
        };

        let currentVersionId = '';

        if (matchedVersion) {
          // UPDATE existing version
          currentVersionId = matchedVersion.id;
          await updateMutation.mutateAsync({
            versionId: currentVersionId,
            data: versionPayload as UpdateBookVersionRequest,
          });
        } else {
          // CREATE new language version
          const createPayload = {
            language: langKey,
            ...versionPayload,
          };
          const newVersion = await createVersionMutation.mutateAsync({
            bookId,
            data: createPayload as CreateBookVersionRequest,
          });
          currentVersionId = newVersion.id;
        }

        // Upsert SEO fields for this language version if available in translations
        const seoData: Record<string, string> = {};
        if (trans.metaTitle) seoData.metaTitle = trans.metaTitle;
        if (trans.metaDescription) seoData.metaDescription = trans.metaDescription;
        if (trans.ogTitle) seoData.ogTitle = trans.ogTitle;
        if (trans.ogDescription) seoData.ogDescription = trans.ogDescription;
        if (trans.ogImageAlt) seoData.ogImageAlt = trans.ogImageAlt;

        if (Object.keys(seoData).length > 0) {
          await seoMutation.mutateAsync({
            versionId: currentVersionId,
            data: seoData,
          });
        }
      }

      enqueueSnackbar('Book data imported successfully across all languages', {
        variant: 'success',
      });
      await refetch();
    } catch (err) {
      console.error('Import error:', err);
      const message = err instanceof Error ? err.message : 'Failed to parse or save imported JSON';
      enqueueSnackbar(message, { variant: 'error' });
      throw err;
    } finally {
      setIsImporting(false);
    }
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
    if (formData.seoOgImageAlt) seoData.ogImageAlt = formData.seoOgImageAlt;

    // Convert form data to API format (without SEO)
    const requestData: UpdateBookVersionRequest = {
      title: formData.title,
      author: formData.author,
      description: formData.description || undefined,
      coverImageUrl: formData.coverImageUrl || undefined,
      type: formData.type,
      isFree: formData.isFree,
      referralUrl: formData.referralUrl || undefined,
      primaryCategoryId: formData.primaryCategoryId || null,
      firstPublishedYear: formData.firstPublishedYear ? Number(formData.firstPublishedYear) : null,
      editionPublishedYear: formData.editionPublishedYear
        ? Number(formData.editionPublishedYear)
        : null,
      originalLanguage: formData.originalLanguage || null,
      copyrightStatus: formData.copyrightStatus || null,
      authorPageUrl: formData.authorPageUrl || null,
      characters:
        formData.characters && formData.characters.length > 0 ? formData.characters : null,
      quotes: formData.quotes && formData.quotes.length > 0 ? formData.quotes : null,
      faq: formData.faq && formData.faq.length > 0 ? formData.faq : null,
      themes: formData.themes && formData.themes.length > 0 ? formData.themes : null,
      originalTitle: formData.originalTitle || null,
      alternativeTitles:
        formData.alternativeTitles && formData.alternativeTitles.length > 0
          ? formData.alternativeTitles
          : null,
      shortDescription: formData.shortDescription || null,
      summaryShort: formData.summaryShort || null,
      symbols: formData.symbols && formData.symbols.length > 0 ? formData.symbols : null,
      coverAlt: formData.coverAlt || null,
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
    }
  };

  const isSubmitting =
    updateMutation.isPending ||
    updateBookMutation.isPending ||
    seoMutation.isPending ||
    isImporting;

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
    handleImportJson,
    isImporting,
    router,
  };
};
