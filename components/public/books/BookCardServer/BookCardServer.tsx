import { BookOpen, Headphones } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { BookCardModel } from '@/types/api-schema';
import styles from '../BookCard.module.scss';
import { StarRatingServer } from '../StarRatingServer';

interface BookCardServerProps {
  book: BookCardModel;
  lang: string;
  labels: {
    coverAltTemplate: string;
    readLabel: string;
    listenLabel: string;
    newLabel: string;
    unknownAuthor: string;
  };
  size?: 'sm' | 'md' | 'lg';
  priority?: boolean;
}

function buildCoverAlt(
  template: string,
  title: string,
  author: string,
  unknownAuthor: string
): string {
  return template.replace('{title}', title).replace('{author}', author || unknownAuthor);
}

export function BookCardServer({
  book,
  lang,
  labels,
  size = 'md',
  priority = false,
}: BookCardServerProps) {
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

  const isNewRelease = (() => {
    if (!book.publishedAt) return false;
    const published = new Date(book.publishedAt);
    if (Number.isNaN(published.getTime())) return false;
    return new Date().getTime() - published.getTime() < 30 * 24 * 60 * 60 * 1000;
  })();

  return (
    <article className={`${styles.card} ${cardClass}`}>
      <div className={styles.cardCoverWrap}>
        <Link href={`/${lang}/book/${slug}`} className={styles.coverLink}>
          <div className={`${styles.coverContainer} ${coverClass}`}>
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt={buildCoverAlt(labels.coverAltTemplate, title, author, labels.unknownAuthor)}
                className={styles.coverImage}
                fill
                sizes={size === 'sm' ? '112px' : size === 'lg' ? '176px' : '144px'}
                quality={70}
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
        {isNewRelease && <span className={styles.ribbon}>{labels.newLabel}</span>}
      </div>

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

        {rating !== null && <StarRatingServer rating={rating} size="sm" />}

        <div className={styles.actions}>
          {hasText && (
            <Link
              href={`/${lang}/book/${slug}`}
              className={styles.actionLink}
              title={labels.readLabel}
            >
              <BookOpen size={14} aria-hidden="true" />
              <span className={textClass}>{labels.readLabel}</span>
            </Link>
          )}
          {hasAudio && (
            <Link
              href={`/${lang}/book/${slug}#audio`}
              className={styles.actionLink}
              title={labels.listenLabel}
            >
              <Headphones size={14} aria-hidden="true" />
              <span className={textClass}>{labels.listenLabel}</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
