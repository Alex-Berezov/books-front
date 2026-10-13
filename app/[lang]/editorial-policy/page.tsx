import { LegalPage } from '@/components/public/legal/LegalPage';
import { getLegalDocument } from '@/content/legal';
import { getPageMetadata } from '@/lib/utils/seo';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const document = getLegalDocument('editorial-policy', resolvedParams.lang);

  return getPageMetadata(
    document.lang,
    '/editorial-policy',
    document.metaTitle,
    document.metaDescription
  );
}

export default async function EditorialPolicyPage({ params }: Props) {
  const resolvedParams = await params;

  return <LegalPage document={getLegalDocument('editorial-policy', resolvedParams.lang)} />;
}
