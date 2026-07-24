import { useState, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { checkBookSlugUniqueness } from '@/api/endpoints/slug-validation';
import { generateSlug } from '@/lib/utils/slug';
import type { CreateBookModalProps, CreateBookFormData } from './CreateBookModal.types';

export const useCreateBookModal = (props: CreateBookModalProps) => {
  const { onClose, lang } = props;

  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

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
   * Handle form submission - redirect to rights intake creation
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Close modal and redirect to rights intake creation
    onClose();

    enqueueSnackbar('Books are created from approved rights intakes', {
      variant: 'info',
      autoHideDuration: 3000,
    });

    // Navigate to rights intake creation page
    router.push(`/admin/${lang}/rights-intakes/new`);
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
    !isValidatingSlug && !!formData.title.trim() && !!formData.author.trim() && !!finalSlug;

  return {
    formData,
    errors,
    generatedSlug,
    finalSlug,
    slugError,
    isValidatingSlug,
    isPending: false,
    canSubmit,
    handleInputChange,
    handleSubmit,
    handleConfirm,
    handleClose,
  };
};
