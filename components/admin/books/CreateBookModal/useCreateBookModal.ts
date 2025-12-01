import { useState, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { checkBookSlugUniqueness } from '@/api/endpoints/slug-validation';
import { useCreateBook } from '@/api/hooks';
import { generateSlug } from '@/lib/utils/slug';
import type { CreateBookModalProps, CreateBookFormData } from './CreateBookModal.types';

export const useCreateBookModal = (props: CreateBookModalProps) => {
  const { onClose, lang } = props;

  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const createBookMutation = useCreateBook();

  // Form state
  const [formData, setFormData] = useState<CreateBookFormData>({
    title: '',
    author: '',
  });

  // Generated slug (for preview)
  const [generatedSlug, setGeneratedSlug] = useState('');

  // Slug validation state
  const [isValidatingSlug, setIsValidatingSlug] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [finalSlug, setFinalSlug] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<Partial<Record<keyof CreateBookFormData, string>>>({});

  /**
   * Generate slug when title changes
   */
  useEffect(() => {
    if (formData.title) {
      const slug = generateSlug(formData.title);
      setGeneratedSlug(slug);
    } else {
      setGeneratedSlug('');
      setFinalSlug('');
      setSlugError(null);
    }
  }, [formData.title]);

  /**
   * Validate slug uniqueness
   */
  useEffect(() => {
    if (!generatedSlug) {
      return;
    }

    const validateSlug = async () => {
      setIsValidatingSlug(true);
      setSlugError(null);

      try {
        const result = await checkBookSlugUniqueness(generatedSlug);

        if (!result.isUnique && result.suggestedSlug) {
          setSlugError(`Slug "${generatedSlug}" is already taken`);
          setFinalSlug(result.suggestedSlug);
        } else {
          setSlugError(null);
          setFinalSlug(generatedSlug);
        }
      } catch (error) {
        // On error, use generated slug (validation failed gracefully)
        setFinalSlug(generatedSlug);
      } finally {
        setIsValidatingSlug(false);
      }
    };

    // Debounce validation
    const timeoutId = setTimeout(validateSlug, 500);

    return () => clearTimeout(timeoutId);
  }, [generatedSlug]);

  /**
   * Handle input change
   */
  const handleInputChange =
    (field: keyof CreateBookFormData) => (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear error for this field
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    };

  /**
   * Validate form
   */
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateBookFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.author.trim()) {
      newErrors.author = 'Author is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Check that we have a valid slug
    if (!finalSlug) {
      setErrors({ title: 'Cannot generate valid slug from title' });
      return;
    }

    try {
      // Create book with generated/suggested slug
      const newBook = await createBookMutation.mutateAsync({
        slug: finalSlug,
      });

      enqueueSnackbar('Book created successfully', { variant: 'success' });

      // Close modal
      onClose();

      // Reset form
      setFormData({ title: '', author: '' });
      setGeneratedSlug('');
      setFinalSlug('');
      setErrors({});

      // Navigate to create first book version with title and author pre-filled
      router.push(
        `/admin/${lang}/books/new?bookId=${newBook.id}&title=${encodeURIComponent(formData.title)}&author=${encodeURIComponent(formData.author)}`
      );
    } catch (error) {
      enqueueSnackbar('Failed to create book. Please try again.', { variant: 'error' });
    }
  };

  /**
   * Handle form submission (wrapper for Modal onConfirm)
   */
  const handleConfirm = () => {
    // Trigger form submission
    const form = document.getElementById('create-book-form') as HTMLFormElement;
    if (form) {
      form.requestSubmit();
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    // Reset form
    setFormData({ title: '', author: '' });
    setGeneratedSlug('');
    setFinalSlug('');
    setErrors({});
    setSlugError(null);

    onClose();
  };

  // Determine if form can be submitted
  const canSubmit =
    !createBookMutation.isPending &&
    !isValidatingSlug &&
    !!formData.title.trim() &&
    !!formData.author.trim() &&
    !!finalSlug;

  return {
    formData,
    errors,
    generatedSlug,
    finalSlug,
    slugError,
    isValidatingSlug,
    isPending: createBookMutation.isPending,
    canSubmit,
    handleInputChange,
    handleSubmit,
    handleConfirm,
    handleClose,
  };
};
