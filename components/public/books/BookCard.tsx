'use client';

import { Badge } from 'antd';
import { BookOpen, Headphones } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLangFromPath } from '@/lib/i18n/lang';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { BookOverview } from '@/types/api-schema';
import styles from './BookCard.module.scss';
import { StarRating } from './StarRating';

interface BookCardProps {
  book: BookOverview;
  size?: 'sm' | 'md' | 'lg';
  priority?: boolean;
}

function getAuthorSlug(author?: string) {
  if (!author || typeof author !== 'string') return '';
  return encodeURIComponent(author.trim().toLowerCase().replace(/\s+/g, '-'));
}

export function BookCard({ book, size = 'md', priority = false }: BookCardProps) {
  const pathname = usePathname();
  const lang = getLangFromPath(pathname);
  const { t } = useTranslation();
  const slug = book.slug || book.id;

  // Check version types available for current language
  const hasText =
    book.versions?.some(
      (v) => v.language === lang && v.status === 'published' && v.type === 'text'
    ) ??
    book.hasText ??
    false;

  const hasAudio =
    book.versions?.some(
      (v) => v.language === lang && v.status === 'published' && v.type === 'audio'
    ) ??
    book.hasAudio ??
    false;

  const cardClass = styles[`card-${size}`] || styles['card-md'];
  const coverClass = styles[`cover-${size}`] || styles['cover-md'];
  const textClass = styles[`text-${size}`] || styles['text-md'];

  const currentLangVersion = book.versions?.find(
    (v) => v.language === lang && v.status === 'published'
  );
  const displayVersion =
    currentLangVersion ||
    book.versions?.find((v) => v.status === 'published') ||
    book.versions?.[0];

  const title = displayVersion?.title || book.title || '';
  const author = displayVersion?.author || book.author || '';
  const coverUrl =
    displayVersion?.coverImageUrl ||
    displayVersion?.coverUrl ||
    book.coverUrl ||
    book.coverImageUrl ||
    '';
  const rating = book.rating ?? null;

  // Determine if it is a new release (created in last 30 days)
  const isNewRelease =
    new Date().getTime() - new Date(book.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000;

  const coverAlt = t('a11y.bookCover')
    .replace('{title}', title)
    .replace('{author}', author || t('book.unknownAuthor'));

  return (
    <article className={`${styles.card} ${cardClass}`}>
      {/* Cover Image */}
      <Link href={`/${lang}/book/${slug}`} className={styles.coverLink}>
        <Badge.Ribbon
          text="New"
          color="var(--public-primary)"
          className={isNewRelease ? styles.showRibbon : styles.hideRibbon}
        >
          <div className={`${styles.coverContainer} ${coverClass}`}>
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt={coverAlt}
                className={styles.coverImage}
                fill
                sizes="(max-width: 768px) 150px, 200px"
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
        </Badge.Ribbon>
      </Link>

      {/* Book Metadata */}
      <div className={styles.metadata}>
        <Link href={`/${lang}/book/${slug}`} className={`${styles.title} ${textClass}`}>
          {title}
        </Link>

        {author && (
          <Link
            href={`/${lang}/author/${getAuthorSlug(author)}`}
            className={`${styles.author} ${textClass}`}
          >
            {author}
          </Link>
        )}

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
