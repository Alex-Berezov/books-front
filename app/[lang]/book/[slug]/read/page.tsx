import { redirect } from 'next/navigation';
import { resolveBookForSubroute } from '@/lib/utils/book-route-guard';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import { CHAPTER_PARAM, parseChapterParam, readerChapterQuery } from './chapterParam';
import ReaderClient from './ReaderClient';

export const metadata: Metadata = {
  robots: 'noindex, follow',
};

type Props = {
  params: Promise<{ lang: string; slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Адрес читалки книги; `chapter` - номер главы из ссылки «глава N»: редирект на канонический
 * слаг или по истории слагов его не теряет (решение арбитра `F03 | F03-3`, В2). Остальная
 * строка запроса не переносится, номер - только прошедший `parseChapterParam`.
 */
const readUrl =
  (lang: string, chapter: number | null = null) =>
  (bookSlug: string) =>
    `/${lang}/book/${bookSlug}/read${chapter === null ? '' : readerChapterQuery(chapter)}`;

function chapterFromSearch(search: Record<string, string | string[] | undefined>): number | null {
  const raw = search[CHAPTER_PARAM];
  return typeof raw === 'string'
    ? parseChapterParam(`?${CHAPTER_PARAM}=${encodeURIComponent(raw)}`)
    : null;
}

export default async function Page({ params, searchParams }: Props) {
  const { lang, slug } = await params;
  const supportedLang = lang as SupportedLang;
  const chapter = chapterFromSearch((await searchParams) ?? {});

  // 🔴 Книгу, которой нет, читалка до 06.09.2026 не отличала от книги без текстовой
  // версии: серверных запросов здесь не было ни одного, любой отказ бутстрапа
  // доезжал до клиента и показывался тем же экраном при HTTP 200 (LEGACY-084).
  // Снять этот запрос ради скорости открытия — значит вернуть soft-404 обратно:
  // статус ответа задаётся здесь и больше нигде.
  const book = await resolveBookForSubroute(supportedLang, slug, readUrl(lang, chapter));

  // 🔴 307, а не 308 (решение арбитра 06.09.2026). Канонический слаг здесь —
  // не свойство адреса, а результат разбора языка по набору опубликованных
  // версий: тот же адрес обязан вести в разные места у разных читателей и после
  // снятия публикации. Бессрочно кэшированный браузером 308 закрепил бы один
  // ответ, и кодом его уже не отозвать. 308 остаётся только истории слагов.
  if (book.slug && book.slug !== slug) {
    redirect(readUrl(lang, chapter)(book.slug));
  }

  // `book.slug || slug`: проверка выше уже считает поле ненадёжным, и уезжать
  // в клиент оно должно с тем же допущением — иначе `undefined` ушёл бы
  // в `/books/undefined/reader-bootstrap` и в кнопку «назад».
  return (
    <ReaderClient
      params={{ lang, slug: book.slug || slug }}
      hasTextVersion={Boolean(book.versionIds?.text)}
    />
  );
}
