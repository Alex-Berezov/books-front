'use client';

import { ChevronLeft, BookOpen, User, Quote, HelpCircle, Users, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePublicAuthor } from '@/api/hooks/useAuthors';
import { Button } from '@/components/common/Button';
import { FaqBlock } from '@/components/common/FaqBlock/FaqBlock';
import { QuotesBlock } from '@/components/common/QuotesBlock/QuotesBlock';
import { RichTextContent } from '@/components/common/RichTextContent';
import { Skeleton, SkeletonBlock } from '@/components/common/Skeleton';
import { authorsBasePath } from '@/components/public/authors/authors-href';
import { BookCard } from '@/components/public/books/BookCard';
import { Breadcrumbs } from '@/components/public/Breadcrumbs/Breadcrumbs';
import { useSmartBack } from '@/components/public/navigation';
import { pluralize, pluralFormsOf } from '@/lib/i18n/plural';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { isOptimizableHost } from '@/lib/utils/image-host';
import { isSafeHref } from '@/lib/utils/safe-href';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookCardModel, PublicAuthorDetail, AuthorQuote, AuthorFaq } from '@/types/api-schema';
import styles from './author.module.scss';

type Props = {
  lang: string;
  authorSlug: string;
  displayName: string;
  authorData?: PublicAuthorDetail | null;
  isFallback?: boolean;
  initialBooks?: BookCardModel[];
};

export default function AuthorDetailClient({
  lang,
  authorSlug,
  displayName,
  authorData,
  isFallback = false,
  initialBooks,
}: Props) {
  const supportedLang = lang as SupportedLang;
  const router = useRouter();
  const goBack = useSmartBack(`/${lang}/catalog`);
  const { t } = useTranslation();

  // If fallback, use books array and filter client-side.
  // Otherwise, use usePublicAuthor React Query hook.
  const { data: dbAuthor, isLoading: isAuthorLoading } = usePublicAuthor(
    supportedLang,
    authorSlug,
    {
      initialData: authorData || undefined,
      enabled: true,
    }
  );

  const isLoading = isFallback ? false : isAuthorLoading;

  // Resolve Author Name and Books
  let finalDisplayName = displayName;
  let authorBooks: BookCardModel[] = [];
  let biography = '';
  let quotes: { text: string; source?: string }[] = [];
  let faq: { question: string; answer: string }[] = [];
  let similarAuthors: { name: string; slug: string | null }[] = [];
  let photoUrl: string | null = null;
  let wikidataUrl: string | null = null;
  let wikipediaUrl: string | null = null;

  let booksTotal: number | undefined;

  if (dbAuthor) {
    finalDisplayName = dbAuthor.name;
    // Книга приходит готовой карточкой — той же, что у `/books/cards`, со слагом автора
    // на языке страницы (LEGACY-006: из отображаемого имени слаг не выводится).
    authorBooks = dbAuthor.books || [];
    booksTotal = dbAuthor.booksTotal;
    biography = dbAuthor.biography || '';
    quotes = (dbAuthor.quotes as AuthorQuote[]) || [];
    faq = (dbAuthor.faq as AuthorFaq[]) || [];
    similarAuthors = dbAuthor.similarAuthors || [];
    photoUrl = dbAuthor.photoUrl || null;
    wikidataUrl = dbAuthor.wikidataUrl || null;
    wikipediaUrl = dbAuthor.wikipediaUrl || null;
  } else if (isFallback) {
    authorBooks = initialBooks || [];
    finalDisplayName = authorBooks.length > 0 ? authorBooks[0].author : displayName;
  }

  // Счёт — от `booksTotal`, а не от длины списка: с F02-3 страница отдаёт порцию.
  const totalBooks = booksTotal ?? authorBooks.length;
  const hasAudiobooks = authorBooks.some((b) => b.hasAudio);
  const ratings = authorBooks
    .map((b) => b.rating)
    .filter((r): r is number => typeof r === 'number');
  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
      : null;

  return (
    <div className={styles.authorPage}>
      <div className={styles.container}>
        {/* Back Button */}
        <Button
          variant="ghost"
          leftIcon={<ChevronLeft size={16} />}
          onClick={goBack}
          className={styles.backBtn}
        >
          {t('author.back')}
        </Button>

        {/* Разметку `BreadcrumbList` выводит страница (`page.tsx`) — здесь только видимые крошки. */}
        <Breadcrumbs
          items={[
            { label: t('breadcrumb.home'), href: `/${supportedLang}` },
            { label: t('breadcrumb.authors'), href: authorsBasePath(supportedLang, null) },
            { label: finalDisplayName },
          ]}
          emitJsonLd={false}
        />

        {/* Author Hero */}
        <div className={styles.authorHero}>
          <div className={styles.avatar}>
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={finalDisplayName}
                className={styles.photo}
                fill
                sizes="150px"
                priority
                unoptimized={!isOptimizableHost(photoUrl)}
              />
            ) : (
              <User size={40} className={styles.avatarIcon} />
            )}
          </div>
          <div className={styles.heroInfo}>
            <h1 className={styles.name}>{finalDisplayName}</h1>
            <div className={styles.stats}>
              {!isLoading && (
                <>
                  <span className={styles.statItem}>
                    <BookOpen size={16} />
                    {totalBooks}{' '}
                    {pluralize(totalBooks, supportedLang, pluralFormsOf(t, 'common.bookCount'))}{' '}
                    {t('author.booksInLibrary')}
                  </span>
                  {hasAudiobooks && (
                    <span className={styles.audioAvailable}>{t('author.audiobooksAvailable')}</span>
                  )}
                  {avgRating && (
                    <span className={styles.statItem}>
                      ★ {avgRating} {t('author.avgRating')}
                    </span>
                  )}
                </>
              )}
            </div>
            {!isLoading && (isSafeHref(wikipediaUrl) || isSafeHref(wikidataUrl)) && (
              <div className={styles.externalLinks}>
                {isSafeHref(wikipediaUrl) && (
                  <a
                    href={wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkItem}
                  >
                    Wikipedia <ExternalLink size={14} />
                  </a>
                )}
                {isSafeHref(wikidataUrl) && (
                  <a
                    href={wikidataUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkItem}
                  >
                    Wikidata <ExternalLink size={14} />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <hr className={styles.divider} />

        {/* About / Biography */}
        {biography && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('author.about', { name: finalDisplayName })}</h2>
            <RichTextContent html={biography} className={styles.biographyContent} />
          </section>
        )}

        {/* Books Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('author.books', { name: finalDisplayName })}</h2>

          {isLoading ? (
            <div className={styles.booksGrid}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard}>
                  <SkeletonBlock className={styles.skeletonCover} />
                  <Skeleton rows={2} title={false} />
                </div>
              ))}
            </div>
          ) : authorBooks.length === 0 ? (
            <div className={styles.empty}>
              <BookOpen size={48} className={styles.emptyIcon} />
              <h3 className={styles.emptyTitle}>{t('author.noBooksFound')}</h3>
              <p className={styles.emptyText}>{t('author.emptyText')}</p>
              <Button variant="primary" onClick={() => router.push(`/${supportedLang}/catalog`)}>
                {t('author.browseCatalog')}
              </Button>
            </div>
          ) : (
            <div className={styles.booksGrid}>
              {authorBooks.map((book, idx) => (
                <BookCard key={book.id} book={book} size="md" priority={idx === 0} />
              ))}
            </div>
          )}
        </section>

        {/* Quotes Section */}
        {quotes.length > 0 && (
          <QuotesBlock items={quotes} title={t('author.quotes')} icon={<Quote size={20} />} />
        )}

        {/* Similar Authors Section */}
        {similarAuthors.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <Users size={20} className={styles.iconTitle} />
              {t('author.similar')}
            </h2>
            <div className={styles.similarGrid}>
              {/* Настоящие ссылки, а не кнопки: поисковик ходит по `href`. Автор без перевода
                  на язык страницы (`slug: null`) — имя текстом. */}
              {similarAuthors.map((sa, idx) =>
                sa.slug ? (
                  <Link
                    key={sa.slug}
                    href={`/${supportedLang}/author/${sa.slug}`}
                    className={styles.similarLink}
                  >
                    {sa.name}
                  </Link>
                ) : (
                  <span key={`text-${idx}`} className={styles.similarName}>
                    {sa.name}
                  </span>
                )
              )}
            </div>
          </section>
        )}

        {/* FAQ Section */}
        {faq.length > 0 && (
          <FaqBlock items={faq} title={t('author.faq')} icon={<HelpCircle size={20} />} />
        )}
      </div>
    </div>
  );
}
