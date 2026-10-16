import { HelpCircle, Quote } from 'lucide-react';
import { FaqBlock } from '@/components/common/FaqBlock/FaqBlock';
import { QuotesBlock } from '@/components/common/QuotesBlock/QuotesBlock';
import { AuthorAdaptations } from '@/components/public/author/AuthorAdaptations/AuthorAdaptations';
import { AuthorAwards } from '@/components/public/author/AuthorAwards/AuthorAwards';
import { AuthorBiography } from '@/components/public/author/AuthorBiography/AuthorBiography';
import { AuthorFunFacts } from '@/components/public/author/AuthorFunFacts/AuthorFunFacts';
import { AuthorInfluences } from '@/components/public/author/AuthorInfluences/AuthorInfluences';
import { AuthorSimilar } from '@/components/public/author/AuthorSimilar/AuthorSimilar';
import { AuthorSources } from '@/components/public/author/AuthorSources/AuthorSources';
import { AuthorTimeline } from '@/components/public/author/AuthorTimeline/AuthorTimeline';
import { toAuthorQuoteItems } from '@/lib/author/author-quotes';
import { createTranslator } from '@/lib/i18n/translate';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { PublicAuthorDetail } from '@/types/api-schema';

interface AuthorPageLowerProps {
  lang: SupportedLang;
  author: PublicAuthorDetail;
}

/**
 * Страница автора от биографии до подписи — блоки 6–15 `product.md` F02, §2, в этом порядке.
 * Каждый блок сам не выводится без данных; подпись редакции — всегда (решение арбитра
 * 16.10.2026, `F02 | F02-4`, Р4).
 */
export function AuthorPageLower({ lang, author }: AuthorPageLowerProps) {
  const t = createTranslator(lang);
  const quotes = toAuthorQuoteItems(lang, author.quotes);
  const faq = author.faq ?? [];

  return (
    <>
      <AuthorBiography lang={lang} biography={author.biography} />
      <AuthorTimeline lang={lang} events={author.timeline} />
      {quotes.length > 0 && (
        <QuotesBlock items={quotes} title={t('author.quotes')} icon={<Quote size={20} />} />
      )}
      <AuthorInfluences lang={lang} influences={author.influences} />
      <AuthorAwards lang={lang} awards={author.awards} />
      <AuthorAdaptations lang={lang} adaptations={author.adaptations} />
      <AuthorFunFacts lang={lang} facts={author.funFacts} />
      <AuthorSimilar lang={lang} authors={author.similarAuthors} />
      {faq.length > 0 && (
        <FaqBlock items={faq} title={t('author.faq')} icon={<HelpCircle size={20} />} />
      )}
      <AuthorSources lang={lang} author={author} />
    </>
  );
}
