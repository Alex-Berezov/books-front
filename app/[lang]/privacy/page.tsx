import { LegalPage } from '@/components/public/legal/LegalPage';
import { getLegalDocument } from '@/content/legal';
import { getPageMetadata } from '@/lib/utils/seo';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const document = getLegalDocument('privacy', resolvedParams.lang);

  return getPageMetadata(document.lang, '/privacy', document.metaTitle, document.metaDescription);
}

export default async function PrivacyPage({ params }: Props) {
  const resolvedParams = await params;

  return <LegalPage document={getLegalDocument('privacy', resolvedParams.lang)} />;
}
