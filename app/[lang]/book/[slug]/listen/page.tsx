import { redirect } from 'next/navigation';
import { resolveBookForSubroute } from '@/lib/utils/book-route-guard';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import ListenClient from './ListenClient';

export const metadata: Metadata = {
  robots: 'noindex, follow',
};

type Props = {
  params: Promise<{ lang: string; slug: string }> | { lang: string; slug: string };
};

const listenUrl = (lang: string) => (bookSlug: string) => `/${lang}/book/${bookSlug}/listen`;

export default async function Page({ params }: Props) {
  const { lang, slug } = await params;
  const supportedLang = lang as SupportedLang;

  // Тот же разбор, что и у читалки (LEGACY-084): несуществующая книга обязана
  // отвечать настоящим 404, а не экраном «нет глав», которым плеер честно
  // сообщает об отсутствии аудио у существующей книги.
  const book = await resolveBookForSubroute(supportedLang, slug, listenUrl(lang));

  // 307, а не 308, по той же причине, что и в читалке (решение арбитра 06.09.2026).
  if (book.slug && book.slug !== slug) {
    redirect(listenUrl(lang)(book.slug));
  }

  // `book.slug || slug` — по той же причине, что и в читалке: поле, которое
  // проверка считает ненадёжным, не может уезжать в клиент как надёжное.
  return <ListenClient params={{ lang, slug: book.slug || slug }} initialBook={book} />;
}
