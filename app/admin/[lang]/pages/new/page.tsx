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
      // ⚠️ TEMPORARY WORKAROUND: Backend не имеет GET /admin/pages/:id endpoint
      // Редиректим на список вместо страницы редактирования
      console.log('Page created successfully:', data);
      alert(
        `✅ Page "${data.title}" created successfully!\n\nNote: Edit functionality disabled until backend adds GET /admin/pages/:id endpoint.`
      );
      router.push(`/admin/${lang}/pages`);

      // TODO: Когда backend добавит GET /admin/pages/:id, заменить на:
      // router.push(`/admin/${lang}/pages/${data.id}`);
    },
    onError: (error) => {
      // TODO: Показать toast с ошибкой
      console.error('Failed to create page:', error);
      alert(`Failed to create page: ${error.message}`);
    },
  });

  const handleSubmit = async (data: PageFormData) => {
    // Формируем SEO объект если есть хотя бы одно заполненное поле
    const seo =
      data.seoMetaTitle || data.seoMetaDescription
        ? {
            metaTitle: data.seoMetaTitle || undefined,
            metaDescription: data.seoMetaDescription || undefined,
          }
        : undefined;

    // Создаем страницу с вложенным seo объектом
    createMutation.mutate({
      lang,
      data: {
        slug: data.slug,
        title: data.title,
        type: data.type,
        content: data.content,
        language: data.language, // Игнорируется backend, берется из :lang
        seo, // ✅ Backend автоматически создаст SEO entity
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
