import { useState, useEffect, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { checkAuthorSlug, createAuthor } from '@/api/endpoints/admin/authors';
import { generateSlug } from '@/lib/utils/slug';
import type { CreateAuthorModalProps, CreateAuthorFormData } from './CreateAuthorModal.types';

/**
 * LEGACY-215: язык, на котором эта форма создаёт перевод. Один литерал на два места —
 * проверку слага и само создание: слаг автора уникален в пределах языка, и проверять его
 * надо ровно на том языке, на котором форма пишет. `props.lang` сюда не подходит вовсе —
 * это язык админ-интерфейса, он уходит только в редирект после создания.
 */
const CREATED_TRANSLATION_LANGUAGE = 'en';

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
  const [slugCheckFailed, setSlugCheckFailed] = useState(false);
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
      setSlugCheckFailed(false);
    }
  }, [formData.name]);

  /**
   * LEGACY-370: три исхода проверки — свободен, занят, проверить не удалось.
   * Прежний слаг снимается сразу, а не по ответу: иначе за полсекунды debounce
   * форма создала бы автора под слагом прошлого имени. Ответ по устаревшему
   * имени отбрасывается флагом `stale` — таймер отменяется, запрос нет.
   */
  useEffect(() => {
    if (!generatedSlug) {
      // Имя, из которого слаг не собирается («!!!», «李白»), не оставляет в форме слаг прошлого имени.
      setIsValidatingSlug(false);
      setFinalSlug('');
      setSlugError(null);
      setSlugCheckFailed(false);
      return;
    }

    let stale = false;
    setIsValidatingSlug(true);
    setFinalSlug('');
    setSlugError(null);
    setSlugCheckFailed(false);

    const validateSlug = async () => {
      try {
        const result = await checkAuthorSlug(generatedSlug, CREATED_TRANSLATION_LANGUAGE);
        if (stale) {
          return;
        }

        if (result.exists) {
          setSlugError(`Slug "${generatedSlug}" is already taken`);
          setFinalSlug(result.suggestedSlug ?? '');
        } else {
          setFinalSlug(generatedSlug);
        }
      } catch {
        if (stale) {
          return;
        }
        // Непроверенный слаг уходит на сервер, но с предупреждением: база отклонит дубль.
        setSlugCheckFailed(true);
        setFinalSlug(generatedSlug);
      } finally {
        if (!stale) {
          setIsValidatingSlug(false);
        }
      }
    };

    const timeoutId = setTimeout(validateSlug, 500);
    return () => {
      stale = true;
      clearTimeout(timeoutId);
    };
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
      setErrors({ name: slugError ?? 'Cannot generate valid slug from name' });
      return;
    }

    setIsPending(true);

    try {
      const newAuthor = await createAuthor({
        translations: [
          {
            language: CREATED_TRANSLATION_LANGUAGE,
            slug: finalSlug,
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
      setSlugCheckFailed(false);

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
    setSlugCheckFailed(false);
    setErrors({});
    onClose();
  };

  return {
    formData,
    errors,
    generatedSlug,
    finalSlug,
    slugError,
    slugCheckFailed,
    isValidatingSlug,
    isPending,
    canSubmit: !!formData.name.trim() && !isValidatingSlug,
    handleInputChange,
    handleConfirm,
    handleClose,
  };
};
