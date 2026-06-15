import { CatalogTemplate } from '@/components/public/catalog/CatalogTemplate';
import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; type?: string; sort?: string }>;
};

const titles: Record<SupportedLang, string> = {
  en: 'Book Catalog - Bibliaris',
  es: 'Catálogo de Libros - Bibliaris',
  fr: 'Catalogue de Livres - Bibliaris',
  pt: 'Catálogo de Libros - Bibliaris',
  ru: 'Каталог Книг - Bibliaris',
};

const descriptions: Record<SupportedLang, string> = {
  en: 'Browse our extensive catalog of books. Read online, listen to audiobooks in multiple languages, and build your digital library.',
  es: 'Explore nuestro amplio catálogo de libros. Lea en línea, escuche audiolibros в varios idiomas y cree su biblioteca digital.',
  fr: 'Parcourez notre vaste catalogue de livres. Lisez en ligne, écoutez des livres audio en plusieurs langues et créez votre bibliothèque numérique.',
  pt: 'Navegue pelo nosso extenso catálogo de livros. Leia online, ouça audiolivros em vários idiomas e crie sua biblioteca digital.',
  ru: 'Просматривайте наш обширный каталог книг. Читайте онлайн, слушайте аудиокниги на разных языках и создавайте свою цифровую библиотеку.',
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang } = await params;
  const sParams = await searchParams;
  const supportedLang = lang as SupportedLang;

  const title = titles[supportedLang] || titles.en;
  const description = descriptions[supportedLang] || descriptions.en;

  const baseMetadata = getPageMetadata(supportedLang, '/catalog', title, description);

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
