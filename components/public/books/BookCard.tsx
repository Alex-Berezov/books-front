'use client';

import { Badge } from 'antd';
import { BookOpen, Headphones } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLangFromPath } from '@/lib/i18n/lang';
import type { BookOverview } from '@/types/api-schema';
import styles from './BookCard.module.scss';
import { StarRating } from './StarRating';

interface BookCardProps {
  book: BookOverview;
  size?: 'sm' | 'md' | 'lg';
}

function getAuthorSlug(author: string) {
  return encodeURIComponent(author.trim().toLowerCase().replace(/\s+/g, '-'));
}

export function BookCard({ book, size = 'md' }: BookCardProps) {
  const pathname = usePathname();
  const lang = getLangFromPath(pathname);
  const slug = book.slug || book.id;

  // Check version types available
  const hasText = book.versions?.some((v) => v.type === 'text');
  const hasAudio = book.versions?.some((v) => v.type === 'audio');

  const cardClass = styles[`card-${size}`] || styles['card-md'];
  const coverClass = styles[`cover-${size}`] || styles['cover-md'];
  const textClass = styles[`text-${size}`] || styles['text-md'];

  // Determine if it is a new release (created in last 30 days)
  const isNewRelease =
    new Date().getTime() - new Date(book.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000;

  return (
    <div className={`${styles.card} ${cardClass}`}>
      {/* Cover Image */}
      <Link href={`/${lang}/book/${slug}`} className={styles.coverLink}>
        <Badge.Ribbon
          text="New"
          color="var(--public-primary)"
          className={isNewRelease ? styles.showRibbon : styles.hideRibbon}
        >
          <div className={`${styles.coverContainer} ${coverClass}`}>
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className={styles.coverImage}
                loading="lazy"
              />
            ) : (
              <div className={styles.coverPlaceholder}>
                <BookOpen size={size === 'sm' ? 24 : 32} className={styles.placeholderIcon} />
                <span className={styles.placeholderText}>{book.title}</span>
              </div>
            )}
          </div>
        </Badge.Ribbon>
      </Link>

      {/* Book Metadata */}
      <div className={styles.metadata}>
        <Link href={`/${lang}/book/${slug}`} className={`${styles.title} ${textClass}`}>
          {book.title}
        </Link>

        <Link
          href={`/${lang}/author/${getAuthorSlug(book.author)}`}
          className={`${styles.author} ${textClass}`}
        >
          {book.author}
        </Link>

        {book.rating !== undefined && book.rating !== null && (
          <StarRating rating={book.rating} size="sm" showCount={false} />
        )}

        <div className={styles.actions}>
          {hasText && (
            <Link href={`/${lang}/book/${slug}`} className={styles.actionLink} title="Read">
              <BookOpen size={14} />
              <span className={textClass}>Read</span>
            </Link>
          )}
          {hasAudio && (
            <Link href={`/${lang}/book/${slug}#audio`} className={styles.actionLink} title="Listen">
              <Headphones size={14} />
              <span className={textClass}>Listen</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
