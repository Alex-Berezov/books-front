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
      console.log('Page created successfully:', data);

      // ✅ Редирект на страницу редактирования
      router.push(`/admin/${lang}/pages/${data.id}`);
    },
    onError: (error) => {
      // TODO: Показать toast с ошибкой
      console.error('Failed to create page:', error);
      alert(`Failed to create page: ${error.message}`);
    },
  });

  const handleSubmit = async (data: PageFormData) => {
    // ✅ Backend теперь поддерживает вложенный seo объект!
    // См. docs/PAGES_SEO_UPDATE_GUIDE.md для деталей

    // Формируем полный SEO объект со всеми полями (только заполненные)
    const seo = {
      // Basic Meta Tags
      metaTitle: data.seoMetaTitle || undefined,
      metaDescription: data.seoMetaDescription || undefined,
      // Technical SEO
      canonicalUrl: data.seoCanonicalUrl || undefined,
      robots: data.seoRobots || undefined,
      // Open Graph
      ogTitle: data.seoOgTitle || undefined,
      ogDescription: data.seoOgDescription || undefined,
      ogImageUrl: data.seoOgImageUrl || undefined,
      // Twitter Card
      twitterCard: data.seoTwitterCard || undefined,
      // ⚠️ Backend не поддерживает twitterTitle и twitterDescription
      // Вместо этого используются metaTitle и metaDescription для Twitter Card
    };

    // Проверяем, есть ли хотя бы одно заполненное SEO поле
    const hasSeoData = Object.values(seo).some((val) => val !== undefined);

    // Создаем страницу с вложенным seo объектом (если есть данные)
    createMutation.mutate({
      lang,
      data: {
        slug: data.slug,
        title: data.title,
        type: data.type,
        content: data.content,
        seo: hasSeoData ? seo : undefined, // ✅ Backend автоматически создаст SEO entity
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
