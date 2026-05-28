import { CatalogTemplate } from '@/components/public/catalog/CatalogTemplate';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ lang: string }>;
};

const titles: Record<SupportedLang, string> = {
  en: 'Book Catalog - Bibliaris',
  es: 'Catálogo de Libros - Bibliaris',
  fr: 'Catalogue de Livres - Bibliaris',
  pt: 'Catálogo de Livros - Bibliaris',
};

const descriptions: Record<SupportedLang, string> = {
  en: 'Browse our extensive catalog of books. Read online, listen to audiobooks in multiple languages, and build your digital library.',
  es: 'Explore nuestro amplio catálogo de libros. Lea en línea, escuche audiolibros en varios idiomas y cree su biblioteca digital.',
  fr: 'Parcourez notre vaste catalogue de livres. Lisez en ligne, écoutez des livres audio en plusieurs langues et créez votre bibliothèque numérique.',
  pt: 'Navegue pelo nosso extenso catálogo de livros. Leia online, ouça audiolivros em vários idiomas e crie sua biblioteca digital.',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const supportedLang = lang as SupportedLang;

  return {
    title: titles[supportedLang] || titles.en,
    description: descriptions[supportedLang] || descriptions.en,
  };
}

export default async function CatalogPage({ params }: Props) {
  const { lang } = await params;
  const supportedLang = lang as SupportedLang;

  return <CatalogTemplate lang={supportedLang} />;
}
