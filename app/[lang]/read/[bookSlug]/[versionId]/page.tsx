import { permanentRedirect } from 'next/navigation';

type Props = {
  params:
    | Promise<{ lang: string; bookSlug: string; versionId: string }>
    | { lang: string; bookSlug: string; versionId: string };
};

export default async function Page({ params }: Props) {
  const resolvedParams = await params;
  const { lang, bookSlug } = resolvedParams;
  permanentRedirect(`/${lang}/book/${bookSlug}/read`);
}
