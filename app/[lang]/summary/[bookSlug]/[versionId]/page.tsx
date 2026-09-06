import { notFound, redirect } from 'next/navigation';
import { resolveBookForSubroute } from '@/lib/utils/book-route-guard';
import type { SupportedLang } from '@/lib/i18n/lang';
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

const summaryUrl = (lang: string, versionId: string) => (bookSlug: string) =>
  `/${lang}/summary/${bookSlug}/${versionId}`;

export default async function Page({ params }: Props) {
  const { lang, bookSlug, versionId } = await params;
  const supportedLang = lang as SupportedLang;

  // Тот же разбор, что у читалки и плеера (LEGACY-084). У саммари вдобавок свой
  // случай того же класса: `versionId` стоит прямо в адресе, и версия, не
  // принадлежащая этой книге, — такой же адрес в никуда, как переименованный слаг.
  // «У версии ещё нет саммари» — это другое, и оно остаётся мягким состоянием
  // внутри `SummaryClient`.
  const book = await resolveBookForSubroute(supportedLang, bookSlug, summaryUrl(lang, versionId));

  // 🔴 Отсутствие самого поля `versions` — не ответ «такой версии нет».
  // `types/api-schema` написан руками и из бэкенда не генерится: сузят там белый
  // список — и `book.versions?.some(...)` разом похоронил бы весь раздел
  // `/{lang}/summary/**` под кэшируемым 404, причём при зелёных тестах (в моках
  // поле есть всегда). Нет поля — это отказ, а не отрицательный ответ.
  if (!Array.isArray(book.versions)) {
    throw new Error(`Book overview for "${bookSlug}" carries no versions array`);
  }
  if (!book.versions.some((version) => version.id === versionId)) notFound();

  // 307, а не 308, по той же причине, что и в читалке (решение арбитра 06.09.2026).
  if (book.slug && book.slug !== bookSlug) {
    redirect(summaryUrl(lang, versionId)(book.slug));
  }

  // `book.slug || bookSlug` — по той же причине, что и в читалке.
  return (
    <SummaryClient
      params={{ lang, bookSlug: book.slug || bookSlug, versionId }}
      initialBook={book}
    />
  );
}
