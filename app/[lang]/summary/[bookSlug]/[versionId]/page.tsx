import type { Metadata } from 'next';
import SummaryClient from './SummaryClient';

export const metadata: Metadata = {
  robots: 'noindex, follow',
};

type Props = {
  params:
    | Promise<{ lang: string; bookSlug: string; versionId: string }>
    | { lang: string; bookSlug: string; versionId: string };
};

export default async function Page({ params }: Props) {
  const resolvedParams = await params;
  return <SummaryClient params={resolvedParams} />;
}
