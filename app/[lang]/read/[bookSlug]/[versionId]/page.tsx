import type { Metadata } from 'next';
import ReaderClient from './ReaderClient';

export const metadata: Metadata = {
  robots: 'noindex, follow',
};

type Props = {
  params: { lang: string; bookSlug: string; versionId: string };
};

export default function Page({ params }: Props) {
  return <ReaderClient params={params} />;
}
