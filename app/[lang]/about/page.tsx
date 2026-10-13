import { LegalPage } from '@/components/public/legal/LegalPage';
import { OrganizationJsonLd } from '@/components/public/seo/OrganizationJsonLd';
import { getLegalDocument } from '@/content/legal';
import { getPageMetadata } from '@/lib/utils/seo';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const document = getLegalDocument('about', resolvedParams.lang);

  return getPageMetadata(document.lang, '/about', document.metaTitle, document.metaDescription);
}

export default async function AboutPage({ params }: Props) {
  const resolvedParams = await params;

  const document = getLegalDocument('about', resolvedParams.lang);

  return (
    <>
      <OrganizationJsonLd lang={document.lang} />
      <LegalPage document={document} />
    </>
  );
}
