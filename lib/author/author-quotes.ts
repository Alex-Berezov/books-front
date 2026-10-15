import type { QuoteItem } from '@/components/common/QuotesBlock/QuotesBlock';
import type { PublicAuthorQuote } from '@/types/api-schema';

/**
 * Цитаты автора в общий `QuotesBlock` (`product.md` F02, §10): книга цитаты есть на сайте —
 * источник ссылкой на неё на языке страницы, нет — текстом. Пустые цитаты отбрасываются.
 */
export function toAuthorQuoteItems(
  lang: string,
  quotes: PublicAuthorQuote[] | null | undefined
): QuoteItem[] {
  return (quotes ?? [])
    .filter((quote) => quote.text?.trim())
    .map((quote) => ({
      text: quote.text,
      source: quote.source || quote.book?.title,
      ...(quote.book ? { sourceHref: `/${lang}/book/${quote.book.slug}` } : {}),
    }));
}
