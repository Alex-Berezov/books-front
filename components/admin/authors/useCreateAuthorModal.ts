import { useState, useEffect, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { checkAuthorSlug, createAuthor } from '@/api/endpoints/admin/authors';
import { generateSlug } from '@/lib/utils/slug';
import type { CreateAuthorModalProps, CreateAuthorFormData } from './CreateAuthorModal.types';

export const useCreateAuthorModal = (props: CreateAuthorModalProps) => {
  const { onClose, lang } = props;
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const [formData, setFormData] = useState<CreateAuthorFormData>({
    name: '',
  });

  const [generatedSlug, setGeneratedSlug] = useState('');
  const [isValidatingSlug, setIsValidatingSlug] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [finalSlug, setFinalSlug] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof CreateAuthorFormData, string>>>({});
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (formData.name) {
      const slugVal = generateSlug(formData.name);
      setGeneratedSlug(slugVal);
    } else {
      setGeneratedSlug('');
      setFinalSlug('');
      setSlugError(null);
    }
  }, [formData.name]);

  useEffect(() => {
    if (!generatedSlug) {
      return;
    }

    const validateSlug = async () => {
      setIsValidatingSlug(true);
      setSlugError(null);

      try {
        const result = await checkAuthorSlug(generatedSlug);

        if (result.exists && result.suggestedSlug) {
          setSlugError(`Slug "${generatedSlug}" is already taken`);
          setFinalSlug(result.suggestedSlug);
        } else {
          setSlugError(null);
          setFinalSlug(generatedSlug);
        }
      } catch (error) {
        setFinalSlug(generatedSlug);
      } finally {
        setIsValidatingSlug(false);
      }
    };

    const timeoutId = setTimeout(validateSlug, 500);
    return () => clearTimeout(timeoutId);
  }, [generatedSlug]);

  const handleInputChange =
    (field: keyof CreateAuthorFormData) => (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));

      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateAuthorFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Author name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validateForm()) {
      return;
    }

    if (!finalSlug) {
      setErrors({ name: 'Cannot generate valid slug from name' });
      return;
    }

    setIsPending(true);

    try {
      const newAuthor = await createAuthor({
        slug: finalSlug,
        translations: [
          {
            language: 'en',
            name: formData.name.trim(),
            biography: '',
            quotes: [],
            faq: [],
            similarSlugs: [],
          },
        ],
      });

      enqueueSnackbar('Author created successfully', { variant: 'success' });
      onClose();
      setFormData({ name: '' });
      setGeneratedSlug('');
      setFinalSlug('');
      setSlugError(null);

      // Redirect to edit page of the newly created author
      router.push(`/admin/${lang}/authors/${newAuthor.id}/edit`);
    } catch (err) {
      enqueueSnackbar((err as Error).message || 'Failed to create author', { variant: 'error' });
    } finally {
      setIsPending(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '' });
    setGeneratedSlug('');
    setFinalSlug('');
    setSlugError(null);
    setErrors({});
    onClose();
  };

  return {
    formData,
    errors,
    generatedSlug,
    finalSlug,
    slugError,
    isValidatingSlug,
    isPending,
    canSubmit: !!formData.name.trim() && !isValidatingSlug,
    handleInputChange,
    handleConfirm,
    handleClose,
  };
};
