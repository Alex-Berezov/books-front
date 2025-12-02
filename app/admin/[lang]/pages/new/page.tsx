'use client';

import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useCreatePage } from '@/api/hooks';
import { PageForm, type PageFormData } from '@/components/admin/pages/PageForm';
import { Button } from '@/components/common/Button';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './page.module.scss';

interface NewPageProps {
  params: {
    lang: SupportedLang;
  };
}

/**
 * New CMS page creation page
 */
export default function NewPage(props: NewPageProps) {
  const { params } = props;
  const { lang } = params;
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  // Mutation for creating page
  const createMutation = useCreatePage({
    onSuccess: (data) => {
      enqueueSnackbar('Page created successfully', { variant: 'success' });

      // ✅ Redirect to edit page
      router.push(`/admin/${lang}/pages/${data.id}`);
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to create page: ${error.message}`, { variant: 'error' });
    },
  });

  const handleSubmit = async (data: PageFormData) => {
    // ✅ Backend now supports nested seo object!
    // See docs/PAGES_SEO_UPDATE_GUIDE.md for details

    // Form complete SEO object with all fields (only filled ones)
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
      // ⚠️ Backend doesn't support twitterTitle and twitterDescription
      // Instead, metaTitle and metaDescription are used for Twitter Card
    };

    // Check if there's at least one filled SEO field
    const hasSeoData = Object.values(seo).some((val) => val !== undefined);

    // Create page with nested seo object (if there's data)
    createMutation.mutate({
      lang,
      data: {
        slug: data.slug,
        title: data.title,
        type: data.type,
        content: data.content,
        seo: hasSeoData ? seo : undefined, // ✅ Backend will automatically create SEO entity
      },
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Create New Page</h1>
        <Button variant="secondary" onClick={() => router.push(`/admin/${lang}/pages`)}>
          ← Back to Pages
        </Button>
      </div>

      <PageForm lang={lang} onSubmit={handleSubmit} isSubmitting={createMutation.isPending} />
    </div>
  );
}
