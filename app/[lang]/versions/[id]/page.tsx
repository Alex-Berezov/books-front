import { notFound } from 'next/navigation';
import { AudioPlayer } from '@/components/public/AudioPlayer';
import { isSupportedLang } from '@/lib/i18n/lang';

type Props = {
  params: Promise<{ lang: string; id: string }>;
};

/**
 * Public audio-player page.
 *
 * Renders the chapter list + HTML5 audio player for a published audio
 * book version. Backed by `GET /versions/:id/audio-chapters` (404s if the
 * version is not published — the player shows an error state in that case).
 */
const PublicVersionPage = async ({ params }: Props) => {
  const { lang, id } = await params;

  if (!isSupportedLang(lang)) {
    notFound();
  }

  return <AudioPlayer versionId={id} />;
};

export default PublicVersionPage;
