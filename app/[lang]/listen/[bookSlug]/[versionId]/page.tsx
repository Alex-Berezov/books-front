import type { Metadata } from 'next';
import ListenClient from './ListenClient';

export const metadata: Metadata = {
  robots: 'noindex, follow',
};

type Props = {
  params: { lang: string; bookSlug: string; versionId: string };
};

export default function Page({ params }: Props) {
  return <ListenClient params={params} />;
}
