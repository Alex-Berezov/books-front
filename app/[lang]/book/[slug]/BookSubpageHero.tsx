import type { ReactNode } from 'react';
import { BookOpen } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { isOptimizableHost } from '@/lib/utils/image-host';
import styles from './BookSubpageHero.module.scss';

interface BookSubpageHeroProps {
  bookHref: string;
  coverUrl?: string | null;
  /** Строка над заголовком: «Краткое содержание книги», у раздела анализа - своя. */
  kicker: string;
  title: string;
  byLabel: string;
  authorName: string;
  authorHref: string | null;
  /** Короткие факты строкой под автором: год, жанр, время чтения. */
  meta: { key: string; content: ReactNode }[];
}

/** Ширина миниатюры обложки, px: та же, что `$cover-thumb-width`; высота - по пропорции 200/290. */
const COVER_WIDTH = 120;
const COVER_HEIGHT = 174;

/**
 * Шапка подстраницы книги (пересказ, позже разбор и анализ): миниатюра обложки со ссылкой
 * на книгу, строка раздела, заголовок, автор и факты. Серверная.
 */
export function BookSubpageHero({
  bookHref,
  coverUrl,
  kicker,
  title,
  byLabel,
  authorName,
  authorHref,
  meta,
}: BookSubpageHeroProps) {
  return (
    <header className={styles.hero}>
      <Link href={bookHref} className={styles.cover} tabIndex={-1} aria-hidden="true">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            width={COVER_WIDTH}
            height={COVER_HEIGHT}
            sizes={`${COVER_WIDTH}px`}
            quality={75}
            priority
            className={styles.coverImg}
            unoptimized={!isOptimizableHost(coverUrl)}
          />
        ) : (
          <BookOpen size={32} className={styles.coverPlaceholder} />
        )}
      </Link>
      <div className={styles.info}>
        <p className={styles.kicker}>{kicker}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.author}>
          {byLabel}{' '}
          {authorHref ? <Link href={authorHref}>{authorName}</Link> : <span>{authorName}</span>}
        </p>
        {meta.length > 0 && (
          <p className={styles.meta}>
            {meta.map((item) => (
              <span key={item.key}>{item.content}</span>
            ))}
          </p>
        )}
      </div>
    </header>
  );
}
