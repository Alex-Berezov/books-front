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
 * Страница создания новой версии книги
 *
 * Отображает форму для создания новой версии (language, title, author и т.д.)
 */
const NewBookVersionPage: FC<NewBookVersionPageProps> = (props) => {
  const { params } = props;
  const { lang } = params;

  // Хуки навигации
  const router = useRouter();
  const searchParams = useSearchParams();

  // Получаем bookId из query параметров
  const bookId = searchParams.get('bookId');

  // Мутация для создания версии
  const createMutation = useCreateBookVersion({
    onSuccess: (data) => {
      // Перенаправляем на страницу редактирования созданной версии
      router.push(`/admin/${lang}/books/versions/${data.id}`);
    },
    onError: (error) => {
      // TODO: Показать toast уведомление об ошибке
      console.error('Failed to create book version:', error);
    },
  });

  /**
   * Обработчик отправки формы
   */
  const handleSubmit = async (formData: BookFormData) => {
    // Проверяем что bookId присутствует
    if (!bookId) {
      console.error('bookId is required');
      return;
    }

    // Преобразуем данные формы в формат API
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

    // Отправляем запрос на создание
    createMutation.mutate({
      bookId,
      data: requestData,
    });
  };

  // Если нет bookId, показываем ошибку
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
