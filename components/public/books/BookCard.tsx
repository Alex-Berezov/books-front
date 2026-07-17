'use client';

import { BookOpen, Headphones } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLangFromPath } from '@/lib/i18n/lang';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { BookCardModel } from '@/types/api-schema';
import styles from './BookCard.module.scss';
import { StarRating } from './StarRating';

interface BookCardProps {
  book: BookCardModel;
  size?: 'sm' | 'md' | 'lg';
  priority?: boolean;
}

export function BookCard({ book, size = 'md', priority = false }: BookCardProps) {
  const pathname = usePathname();
  const lang = getLangFromPath(pathname);
  const { t } = useTranslation();
  const slug = book.slug || book.id;

  const hasText = book.hasText;
  const hasAudio = book.hasAudio;

  const cardClass = styles[`card-${size}`] || styles['card-md'];
  const coverClass = styles[`cover-${size}`] || styles['cover-md'];
  const textClass = styles[`text-${size}`] || styles['text-md'];

  const title = book.title || '';
  const author = book.author || '';
  const coverUrl = book.coverImageUrl || '';
  const rating = book.rating ?? null;

  // Determine if it is a new release: publishedAt within last 30 days.
  // Falls back to a sentinel that disables the ribbon when publishedAt is null.
  const isNewRelease = (() => {
    if (!book.publishedAt) return false;
    const published = new Date(book.publishedAt);
    if (Number.isNaN(published.getTime())) return false;
    return new Date().getTime() - published.getTime() < 30 * 24 * 60 * 60 * 1000;
  })();

  const coverAlt = t('a11y.bookCover')
    .replace('{title}', title)
    .replace('{author}', author || t('book.unknownAuthor'));

  return (
    <article className={`${styles.card} ${cardClass}`}>
      {/* Cover Image */}
      <div className={styles.cardCoverWrap}>
        <Link href={`/${lang}/book/${slug}`} className={styles.coverLink}>
          <div className={`${styles.coverContainer} ${coverClass}`}>
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt={coverAlt}
                className={styles.coverImage}
                fill
                sizes={size === 'sm' ? '112px' : size === 'lg' ? '176px' : '144px'}
                priority={priority}
              />
            ) : (
              <div className={styles.coverPlaceholder}>
                <BookOpen
                  size={size === 'sm' ? 24 : 32}
                  className={styles.placeholderIcon}
                  aria-hidden="true"
                />
                <span className={styles.placeholderText}>{title}</span>
              </div>
            )}
          </div>
        </Link>
        {isNewRelease && <span className={styles.ribbon}>New</span>}
      </div>

      {/* Book Metadata */}
      <div className={styles.metadata}>
        <Link href={`/${lang}/book/${slug}`} className={`${styles.title} ${textClass}`}>
          {title}
        </Link>

        {author && book.authorSlug ? (
          <Link
            href={`/${lang}/author/${book.authorSlug}`}
            className={`${styles.author} ${textClass}`}
          >
            {author}
          </Link>
        ) : author ? (
          <span className={`${styles.author} ${textClass}`}>{author}</span>
        ) : null}

        {rating !== null && <StarRating rating={rating} size="sm" showCount={false} />}

        <div className={styles.actions}>
          {hasText && (
            <Link href={`/${lang}/book/${slug}`} className={styles.actionLink} title="Read">
              <BookOpen size={14} aria-hidden="true" />
              <span className={textClass}>Read</span>
            </Link>
          )}
          {hasAudio && (
            <Link href={`/${lang}/book/${slug}#audio`} className={styles.actionLink} title="Listen">
              <Headphones size={14} aria-hidden="true" />
              <span className={textClass}>Listen</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
