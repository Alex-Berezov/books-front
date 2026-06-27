'use client';

import { Divider, Skeleton } from 'antd';
import {
  ChevronLeft,
  BookOpen,
  User,
  Quote,
  HelpCircle,
  AudioLines,
  Users,
  ExternalLink,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePublicAuthor } from '@/api/hooks/useAuthors';
import { useBooks } from '@/api/hooks/useBooks';
import { Button } from '@/components/common/Button';
import { BookCard } from '@/components/public/books/BookCard';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview, PublicAuthorDetail, AuthorQuote, AuthorFaq } from '@/types/api-schema';
import styles from './author.module.scss';

type Props = {
  lang: string;
  authorSlug: string;
  displayName: string;
  authorData?: PublicAuthorDetail | null;
  isFallback?: boolean;
  initialBooks?: BookOverview[];
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

  const { data: booksData, isLoading: isBooksLoading } = useBooks(
    { limit: 100 },
    {
      initialData: initialBooks
        ? {
            data: initialBooks,
            meta: { total: initialBooks.length, page: 1, limit: 100, totalPages: 1 },
          }
        : undefined,
      enabled: isFallback,
    }
  );

  const isLoading = isFallback ? isBooksLoading : isAuthorLoading;

  // Resolve Author Name and Books
  let finalDisplayName = displayName;
  let authorBooks: BookOverview[] = [];
  let biography = '';
  let quotes: { text: string; source?: string }[] = [];
  let faq: { question: string; answer: string }[] = [];
  let similarAuthors: { name: string; slug: string }[] = [];
  let photoUrl: string | null = null;
  let wikidataUrl: string | null = null;
  let wikipediaUrl: string | null = null;

  if (dbAuthor) {
    finalDisplayName = dbAuthor.name;
    authorBooks = dbAuthor.books || [];
    biography = dbAuthor.biography || '';
    quotes = (dbAuthor.quotes as AuthorQuote[]) || [];
    faq = (dbAuthor.faq as AuthorFaq[]) || [];
    similarAuthors = dbAuthor.similarAuthors || [];
    photoUrl = dbAuthor.photoUrl || null;
    wikidataUrl = dbAuthor.wikidataUrl || null;
    wikipediaUrl = dbAuthor.wikipediaUrl || null;
  } else if (isFallback) {
    const allBooks = booksData?.data || [];
    const searchName = decodeURIComponent(authorSlug).replace(/-/g, ' ');
    authorBooks = allBooks.filter(
      (b: BookOverview) => b.author && b.author.toLowerCase() === searchName.toLowerCase()
    );
    finalDisplayName = authorBooks.length > 0 ? authorBooks[0].author : displayName;
  }

  const totalBooks = authorBooks.length;
  const audioBooks = authorBooks.filter((b) =>
    b.versions?.some(
      (v) => v.language === supportedLang && v.status === 'published' && v.type === 'audio'
    )
  );
  const textBooks = authorBooks.filter((b) =>
    b.versions?.some(
      (v) => v.language === supportedLang && v.status === 'published' && v.type === 'text'
    )
  );

  const hasAudiobooks = audioBooks.length > 0;
  const ratings = authorBooks
    .map((b) => b.rating)
    .filter((r): r is number => typeof r === 'number');
  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
      : null;

  // Localized Headings
  const headings = {
    ru: {
      about: `Об авторе ${finalDisplayName}`,
      books: `Книги автора ${finalDisplayName}`,
      popular: 'Популярные книги',
      audio: 'Аудиокниги',
      quotes: 'Цитаты',
      similar: 'Похожие авторы',
      faq: 'Часто задаваемые вопросы (FAQ)',
    },
    es: {
      about: `Acerca de ${finalDisplayName}`,
      books: `Libros de ${finalDisplayName}`,
      popular: 'Libros populares',
      audio: 'Audiolibros',
      quotes: 'Frases',
      similar: 'Autores similares',
      faq: 'Preguntas frecuentes (FAQ)',
    },
    pt: {
      about: `Sobre ${finalDisplayName}`,
      books: `Livros de ${finalDisplayName}`,
      popular: 'Livros populares',
      audio: 'Audiolivros',
      quotes: 'Frases',
      similar: 'Autores semelhantes',
      faq: 'Perguntas frequentes (FAQ)',
    },
    fr: {
      about: `À propos de ${finalDisplayName}`,
      books: `Livres de ${finalDisplayName}`,
      popular: 'Livres populaires',
      audio: 'Livres audio',
      quotes: 'Citations',
      similar: 'Auteurs similaires',
      faq: 'FAQ',
    },
    en: {
      about: `About ${finalDisplayName}`,
      books: `Books by ${finalDisplayName}`,
      popular: 'Popular Books',
      audio: 'Audiobooks',
      quotes: 'Quotes',
      similar: 'Similar Authors',
      faq: 'FAQ',
    },
  }[supportedLang] || {
    about: `About ${finalDisplayName}`,
    books: `Books by ${finalDisplayName}`,
    popular: 'Popular Books',
    audio: 'Audiobooks',
    quotes: 'Quotes',
    similar: 'Similar Authors',
    faq: 'FAQ',
  };

  return (
    <div className={styles.authorPage}>
      <div className={styles.container}>
        {/* Back Button */}
        <Button
          variant="ghost"
          leftIcon={<ChevronLeft size={16} />}
          onClick={() => router.back()}
          className={styles.backBtn}
        >
          {t('author.back')}
        </Button>

        {/* Author Hero */}
        <div className={styles.authorHero}>
          <div className={styles.avatar}>
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={finalDisplayName} className={styles.photo} />
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
                    {totalBooks} {totalBooks === 1 ? 'book' : 'books'} {t('author.booksInLibrary')}
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
            {!isLoading && (wikipediaUrl || wikidataUrl) && (
              <div className={styles.externalLinks}>
                {wikipediaUrl && (
                  <a
                    href={wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkItem}
                  >
                    Wikipedia <ExternalLink size={14} />
                  </a>
                )}
                {wikidataUrl && (
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

        <Divider className={styles.divider} />

        {/* Books Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{headings.books}</h2>

          {isLoading ? (
            <div className={styles.booksGrid}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard}>
                  <Skeleton.Button active className={styles.skeletonCover} />
                  <Skeleton active paragraph={{ rows: 2 }} title={false} />
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
              {authorBooks.map((book) => (
                <BookCard key={book.id} book={book} size="md" />
              ))}
            </div>
          )}
        </section>

        {/* About / Biography */}
        {biography && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{headings.about}</h2>
            <div className={styles.biographyContent}>{biography}</div>
          </section>
        )}

        {/* Popular Books Section */}
        {!isLoading && textBooks.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{headings.popular}</h2>
            <div className={styles.booksGrid}>
              {textBooks.slice(0, 4).map((book) => (
                <BookCard key={book.id} book={book} size="md" />
              ))}
            </div>
          </section>
        )}

        {/* Audiobooks Section */}
        {!isLoading && hasAudiobooks && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <AudioLines size={20} className={styles.iconTitle} />
              {headings.audio}
            </h2>
            <div className={styles.booksGrid}>
              {audioBooks.map((book) => (
                <BookCard key={book.id} book={book} size="md" />
              ))}
            </div>
          </section>
        )}

        {/* Quotes Section */}
        {quotes.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <Quote size={20} className={styles.iconTitle} />
              {headings.quotes}
            </h2>
            <div className={styles.quotesGrid}>
              {quotes.map((q, idx) => (
                <blockquote key={idx} className={styles.quoteCard}>
                  <p className={styles.quoteText}>&ldquo;{q.text}&rdquo;</p>
                  {q.source && <cite className={styles.quoteSource}>— {q.source}</cite>}
                </blockquote>
              ))}
            </div>
          </section>
        )}

        {/* Similar Authors Section */}
        {similarAuthors.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <Users size={20} className={styles.iconTitle} />
              {headings.similar}
            </h2>
            <div className={styles.similarGrid}>
              {similarAuthors.map((sa, idx) => (
                <Button
                  key={idx}
                  variant="ghost"
                  onClick={() => router.push(`/${supportedLang}/author/${sa.slug}`)}
                  className={styles.similarBtn}
                >
                  {sa.name}
                </Button>
              ))}
            </div>
          </section>
        )}

        {/* FAQ Section */}
        {faq.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <HelpCircle size={20} className={styles.iconTitle} />
              {headings.faq}
            </h2>
            <div className={styles.faqList}>
              {faq.map((item, idx) => (
                <details key={idx} className={styles.faqDetails}>
                  <summary className={styles.faqSummary}>{item.question}</summary>
                  <div className={styles.faqAnswer}>{item.answer}</div>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
