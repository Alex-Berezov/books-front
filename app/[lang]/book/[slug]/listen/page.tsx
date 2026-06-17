import type { Metadata } from 'next';
import ListenClient from './ListenClient';

export const metadata: Metadata = {
  robots: 'noindex, follow',
};

type Props = {
  params: Promise<{ lang: string; slug: string }> | { lang: string; slug: string };
};

export default async function Page({ params }: Props) {
  const resolvedParams = await params;
  return <ListenClient params={resolvedParams} />;
}
