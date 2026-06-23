import { resolveSeo } from '@/api/endpoints/public';
import { CatalogTemplate } from '@/components/public/catalog/CatalogTemplate';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; type?: string; sort?: string }>;
};

const titles: Record<SupportedLang, string> = {
  en: 'All Books Catalog - Read & Listen Free | Bibliaris',
  es: 'Catálogo completo de libros - Leer y escuchar gratis | Bibliaris',
  fr: 'Catalogue complet de livres - Lire et écouter gratuit | Bibliaris',
  pt: 'Catálogo completo de livros - Ler e ouvir grátis | Bibliaris',
  ru: 'Каталог книг — читать и слушать бесплатно | Bibliaris',
};

const descriptions: Record<SupportedLang, string> = {
  en: 'Browse our full catalog of books on Bibliaris. Explore classic literature, audiobooks, summaries, popular genres, and new releases.',
  es: 'Explora nuestro catálogo completo de libros en Bibliaris. Descubre literatura clásica, audiolibros, resúmenes, géneros populares y novedades.',
  fr: 'Découvrez notre catalogue complet de livres sur Bibliaris. Explorez la littérature classique, les livres audio, les résumés, les genres populaires et les nouveautés.',
  pt: 'Explore nosso catálogo completo de livros no Bibliaris. Descubra literatura clássica, audiolibros, resumos, gêneros populares e lançamentos.',
  ru: 'Просмотрите полный каталог книг на Bibliaris. Откройте для себя классическую литературу, аудиокниги, краткие содержания, популярные жанры и новинки.',
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang } = await params;
  const sParams = await searchParams;
  const supportedLang = lang as SupportedLang;

  let baseMetadata: Metadata;
  try {
    const seo = await resolveSeo(supportedLang, 'catalog', 'catalog');
    const alternatesLanguages: Record<string, string> = {};
    (seo.hreflangs || seo.hreflang)?.forEach((item) => {
      if (item.hreflang) {
        alternatesLanguages[item.hreflang] = item.href;
      }
    });

    baseMetadata = {
      title: seo.meta.title,
      description: seo.meta.description || undefined,
      robots: seo.meta.robots || undefined,
      alternates: {
        canonical: seo.meta.canonicalUrl || undefined,
        languages: alternatesLanguages,
      },
      openGraph: {
        title: seo.openGraph.title,
        description: seo.openGraph.description || undefined,
        type: 'website',
        url: seo.openGraph.url,
      },
    };
  } catch (error) {
    console.error('Error resolving SEO for catalog:', error);
    const title = titles[supportedLang] || titles.en;
    const description = descriptions[supportedLang] || descriptions.en;
    baseMetadata = getPageMetadata(supportedLang, '/catalog', title, description);
  }

  if (sParams.q || sParams.type || sParams.sort) {
    baseMetadata.robots = 'noindex, follow';
  }

  return baseMetadata;
}

export default async function CatalogPage({ params }: Props) {
  const { lang } = await params;
  const supportedLang = lang as SupportedLang;

  return <CatalogTemplate lang={supportedLang} />;
}
