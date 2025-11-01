'use client';

import { useRouter } from 'next/navigation';
import { useCreatePage } from '@/api/hooks/useAdmin';
import { PageForm, type PageFormData } from '@/components/admin/pages/PageForm';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './page.module.scss';

interface NewPageProps {
  params: {
    lang: SupportedLang;
  };
}

/**
 * Страница создания новой CMS страницы
 */
export default function NewPage(props: NewPageProps) {
  const { params } = props;
  const { lang } = params;
  const router = useRouter();

  // Mutation для создания страницы
  const createMutation = useCreatePage({
    onSuccess: (data) => {
      // Перенаправляем на страницу редактирования
      router.push(`/admin/${lang}/pages/${data.id}`);
    },
    onError: (error) => {
      // TODO: Показать toast с ошибкой
      console.error('Failed to create page:', error);
      alert(`Failed to create page: ${error.message}`);
    },
  });

  const handleSubmit = async (data: PageFormData) => {
    // Создаем страницу
    createMutation.mutate({
      lang,
      data: {
        language: data.language,
        title: data.title,
        slug: data.slug,
        content: data.content,
        seo: {
          title: data.seoTitle || undefined,
          description: data.seoDescription || undefined,
        },
      },
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Create New Page</h1>
        <button
          className={styles.backButton}
          onClick={() => router.push(`/admin/${lang}/pages`)}
          type="button"
        >
          ← Back to Pages
        </button>
      </div>

      <PageForm lang={lang} onSubmit={handleSubmit} isSubmitting={createMutation.isPending} />
    </div>
  );
}
