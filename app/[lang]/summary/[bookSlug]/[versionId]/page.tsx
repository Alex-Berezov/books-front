import type { Metadata } from 'next';
import SummaryClient from './SummaryClient';

export const metadata: Metadata = {
  robots: 'noindex, follow',
};

type Props = {
  params: { lang: string; bookSlug: string; versionId: string };
};

export default function Page({ params }: Props) {
  return <SummaryClient params={params} />;
}
