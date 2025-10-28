'use client';

import type { FC } from 'react';
import { useRouter } from 'next/navigation';
import { useBookVersion, useUpdateBookVersion } from '@/api/hooks/useAdmin';
import { BookForm, type BookFormData } from '@/components/admin/books';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { UpdateBookVersionRequest } from '@/types/api-schema';

interface EditBookVersionPageProps {
  params: {
    lang: SupportedLang;
    id: string;
  };
}

/**
 * Страница редактирования версии книги
 *
 * Загружает существующую версию и позволяет редактировать её данные
 */
const EditBookVersionPage: FC<EditBookVersionPageProps> = (props) => {
  const { params } = props;
  const { lang, id: versionId } = params;

  const router = useRouter();

  // Загружаем данные версии
  const { data: version, error, isLoading } = useBookVersion(versionId);

  // Мутация для обновления версии
  const updateMutation = useUpdateBookVersion({
    onSuccess: () => {
      // TODO: Показать toast уведомление об успехе
      console.log('Book version updated successfully');
    },
    onError: (error) => {
      // TODO: Показать toast уведомление об ошибке
      console.error('Failed to update book version:', error);
    },
  });

  /**
   * Обработчик отправки формы
   */
  const handleSubmit = async (formData: BookFormData) => {
    // Преобразуем данные формы в формат API
    const requestData: UpdateBookVersionRequest = {
      title: formData.title,
      author: formData.author,
      description: formData.description || undefined,
      coverImageUrl: formData.coverImageUrl || undefined,
      type: formData.type,
      isFree: formData.isFree,
      referralUrl: formData.referralUrl || undefined,
      seoMetaTitle: formData.seoMetaTitle || undefined,
      seoMetaDescription: formData.seoMetaDescription || undefined,
    };

    // Отправляем запрос на обновление
    updateMutation.mutate({
      versionId,
      data: requestData,
    });
  };

  // Loading состояние
  if (isLoading) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>Loading...</p>
      </div>
    );
  }

  // Error состояние
  if (error || !version) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>Error</h1>
        <p>Failed to load book version. {error?.message || 'Version not found.'}</p>
        <button
          onClick={() => router.push(`/admin/${lang}/books`)}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: '#1890ff',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Back to Books List
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => router.push(`/admin/${lang}/books`)}
          style={{
            padding: '0.5rem 1rem',
            background: '#f0f0f0',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '1rem',
          }}
        >
          ← Back to Books List
        </button>
        <h1>Edit Book Version</h1>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          {version.title} • {version.language.toUpperCase()} • {version.status}
        </p>
      </div>
      <BookForm
        initialData={version}
        isSubmitting={updateMutation.isPending}
        lang={lang}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default EditBookVersionPage;
