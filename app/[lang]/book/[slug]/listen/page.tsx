import { redirect } from 'next/navigation';
import { resolveBookForSubroute } from '@/lib/utils/book-route-guard';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import ListenClient from './ListenClient';
import { chapterFromSearchParams, listenChapterHref } from '../read/chapterParam';

export const metadata: Metadata = {
  robots: 'noindex, follow',
};

type Props = {
  params: Promise<{ lang: string; slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Адрес плеера книги; `chapter` - номер аудиоглавы из ссылки «Слушать» у сцены мира книги
 * (решение `F08 | F08-3` Q6): редирект на канонический слаг его не теряет, как и у читалки.
 * Остальная строка запроса не переносится, номер - только прошедший `parseChapterParam`.
 */
const listenUrl =
  (lang: string, chapter: number | null = null) =>
  (bookSlug: string) =>
    chapter === null
      ? `/${lang}/book/${bookSlug}/listen`
      : listenChapterHref(`/${lang}/book/${bookSlug}`, chapter);

export default async function Page({ params, searchParams }: Props) {
  const { lang, slug } = await params;
  const supportedLang = lang as SupportedLang;
  const chapter = chapterFromSearchParams((await searchParams) ?? {});

  // Тот же разбор, что и у читалки (LEGACY-084): несуществующая книга обязана
  // отвечать настоящим 404, а не экраном «нет глав», которым плеер честно
  // сообщает об отсутствии аудио у существующей книги.
  const book = await resolveBookForSubroute(supportedLang, slug, listenUrl(lang, chapter));

  // 307, а не 308, по той же причине, что и в читалке (решение арбитра 06.09.2026).
  if (book.slug && book.slug !== slug) {
    redirect(listenUrl(lang, chapter)(book.slug));
  }

  // `book.slug || slug` — по той же причине, что и в читалке: поле, которое
  // проверка считает ненадёжным, не может уезжать в клиент как надёжное.
  return <ListenClient params={{ lang, slug: book.slug || slug }} initialBook={book} />;
}
