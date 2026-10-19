import type { ReactNode } from 'react';
import { BookOpen, Headphones } from 'lucide-react';
import Link from 'next/link';
import styles from './BookSubpageActions.module.scss';

export interface BookCtaLink {
  href: string;
  label: string;
}

/**
 * Кнопки «Читать» и «Слушать» подстраниц книги (пересказ, анализ) - только те, что у книги есть.
 * `children` - дополнительные ссылки в той же строке (на анализе - ссылка на пересказ).
 * Ничего нет - ничего не рисуется.
 */
export function BookCtaButtons({
  read,
  listen,
  children,
  className,
}: {
  read: BookCtaLink | null;
  listen: BookCtaLink | null;
  children?: ReactNode;
  /** Отступ строки на месте вызова (под карточкой произведения анализа - свой). */
  className?: string;
}) {
  if (!read && !listen && !children) return null;
  return (
    <div className={className ? `${styles.actions} ${className}` : styles.actions}>
      {read && (
        <Link href={read.href} className={styles.ctaPrimary}>
          <BookOpen size={18} aria-hidden="true" />
          {read.label}
        </Link>
      )}
      {listen && (
        <Link href={listen.href} className={styles.ctaSecondary}>
          <Headphones size={18} aria-hidden="true" />
          {listen.label}
        </Link>
      )}
      {children}
    </div>
  );
}

/** Секция подстраницы книги с заголовком - одна разметка и стиль на «Узнать больше» и «Дальше». */
export function BookSubpageSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.block} aria-labelledby={id}>
      <h2 id={id} className={styles.blockTitle}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Блок «Дальше» подстраниц книги: заголовок и кнопки чтения и аудио. `id` заголовка - свой
 * у каждой страницы (на пересказе на нём держатся тесты и ссылки, на анализе - свой якорь).
 */
export function BookContinueBlock({
  id,
  title,
  read,
  listen,
}: {
  id: string;
  title: string;
  read: BookCtaLink | null;
  listen: BookCtaLink | null;
}) {
  if (!read && !listen) return null;
  return (
    <BookSubpageSection id={id} title={title}>
      <BookCtaButtons read={read} listen={listen} />
    </BookSubpageSection>
  );
}
