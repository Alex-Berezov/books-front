/**
 * Modal for creating a new book
 *
 * Allows admin to enter book title and author,
 * automatically generates slug and validates its uniqueness.
 */

'use client';

import { useEffect, useState } from 'react';
import type { FC, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { checkBookSlugUniqueness } from '@/api/endpoints/slug-validation';
import { useCreateBook } from '@/api/hooks';
import { Modal } from '@/components/common/Modal';
import { generateSlug } from '@/lib/utils/slug';
import type { CreateBookModalProps, CreateBookFormData } from './CreateBookModal.types';
import styles from './CreateBookModal.module.scss';

/**
 * Modal component for creating new book
 *
 * Features:
 * - Title and author input fields
 * - Automatic slug generation from title
 * - Slug uniqueness validation
 * - Loading states and error handling
 */
export const CreateBookModal: FC<CreateBookModalProps> = (props) => {
  const { isOpen, onClose, lang } = props;

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
    formData.title.trim() &&
    formData.author.trim() &&
    finalSlug;

  return (
    <Modal
      confirmText={createBookMutation.isPending ? 'Creating...' : 'Create Book'}
      confirmVariant="primary"
      isLoading={createBookMutation.isPending}
      isConfirmDisabled={!canSubmit}
      isOpen={isOpen}
      title="Create New Book"
      onCancel={handleClose}
      onConfirm={handleConfirm}
    >
      <form className={styles.form} id="create-book-form" onSubmit={handleSubmit}>
        {/* Title field */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="book-title">
            Book Title
            <span className={styles.required}>*</span>
          </label>
          <input
            autoFocus
            className={`${styles.input} ${errors.title ? styles.error : ''}`}
            disabled={createBookMutation.isPending}
            id="book-title"
            placeholder="e.g. Harry Potter and the Philosopher's Stone"
            type="text"
            value={formData.title}
            onChange={handleInputChange('title')}
          />
          {errors.title && <span className={styles.errorMessage}>{errors.title}</span>}
          {generatedSlug && !errors.title && (
            <div>
              <div className={styles.hint}>Generated slug:</div>
              <div className={styles.generatedSlug}>
                {slugError ? finalSlug : generatedSlug}
                {slugError && <span> (suggested alternative)</span>}
              </div>
              {isValidatingSlug && (
                <div className={styles.loadingContainer}>
                  <div className={styles.spinner} />
                  <span>Checking uniqueness...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Author field */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="book-author">
            Author
            <span className={styles.required}>*</span>
          </label>
          <input
            className={`${styles.input} ${errors.author ? styles.error : ''}`}
            disabled={createBookMutation.isPending}
            id="book-author"
            placeholder="e.g. J.K. Rowling"
            type="text"
            value={formData.author}
            onChange={handleInputChange('author')}
          />
          {errors.author && <span className={styles.errorMessage}>{errors.author}</span>}
        </div>
      </form>
    </Modal>
  );
};
