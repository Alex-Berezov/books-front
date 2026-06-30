import { getPageMetadata } from '@/lib/utils/seo';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import CategoriesIndexClient from './CategoriesIndexClient';

type Props = {
  params: Promise<{ lang: string }> | { lang: string };
};

const pageTitles: Record<SupportedLang, string> = {
  en: 'Book Categories - Bibliaris',
  es: 'Categorías de libros - Bibliaris',
  fr: 'Catégories de livres - Bibliaris',
  pt: 'Categorias de livros - Bibliaris',
  ru: 'Категории книг — Bibliaris',
};

const pageDescriptions: Record<SupportedLang, string> = {
  en: 'Browse books by category. Find classic literature, poetry, philosophy, and more.',
  es: 'Explora libros por categoría. Encuentra literatura clásica, poesía, filosofía y más.',
  fr: 'Parcourez les livres par catégorie. Littérature classique, poésie, philosophie et plus.',
  pt: 'Explore livros por categoria. Literatura clássica, poesia, filosofia e mais.',
  ru: 'Просматривайте книги по категориям. Классическая литература, поэзия, философия и другое.',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const lang = resolvedParams.lang as SupportedLang;

  const title = pageTitles[lang] || pageTitles.en;
  const description = pageDescriptions[lang] || pageDescriptions.en;

  return getPageMetadata(lang, '/categories', title, description);
}

export default async function CategoriesIndexPage({ params }: Props) {
  const resolvedParams = await params;
  const { lang } = resolvedParams;

  return <CategoriesIndexClient lang={lang} />;
}
