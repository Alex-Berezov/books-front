import type { FC } from 'react';
import { User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { AuthorListItem } from '@/types/api-schema';
import styles from './AuthorCard.module.scss';
import { pluralize, type PluralForms } from './authors-plural';

/**
 * Размер круга портрета. Дублирует `$author-portrait-size` из `styles/tokens.scss`:
 * `next/image` требует `width`/`height` пропсами и css-переменную туда не примет.
 */
const PORTRAIT_SIZE = 96;

/** На узком экране круг меньше, и оптимизатору стоит знать оба размера. */
const PORTRAIT_SIZES = '(max-width: 480px) 72px, 96px';

export interface AuthorCardLabels {
  books: PluralForms;
  audio: PluralForms;
  audioBadge: string;
  bornPrefix: string;
}

export interface AuthorCardProps {
  author: AuthorListItem;
  lang: SupportedLang;
  labels: AuthorCardLabels;
}

/**
 * Хосты, для которых оптимизатор Next настроен (`next.config.js`, `remotePatterns`).
 *
 * ⚠️ Список нужен не ради экономии, а ради того, чтобы фото вообще показалось.
 * Оптимизатор на неразрешённом хосте отвечает 400, и картинка не появляется —
 * а `AuthorCard` серверный, `onError` в нём не поставить. Поэтому: разрешённый
 * хост идёт через оптимизатор (в кружок 96px незачем отдавать оригинал —
 * их на странице двадцать четыре), остальные рендерятся `unoptimized`, ровно
 * как это делает страница автора. Заглушка — только когда фото нет вовсе.
 */
export const isOptimizableHost = (url: string): boolean => {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol === 'http:') return hostname === 'localhost';
    return protocol === 'https:' && hostname.endsWith('.com');
  } catch {
    // Относительный путь — это наш же домен, он оптимизируется.
    return url.startsWith('/');
  }
};

/**
 * Годы жизни: `1821 — 1881`, у живого `род. 1952`, а без дат — строки нет вовсе.
 *
 * Дат в базе может не быть ни одной, и «— —» в карточке выглядело бы как сбой.
 * Даты хранятся строками `YYYY-MM-DD`, поэтому берётся первая четвёрка цифр,
 * а не `new Date()`: неполная дата вроде `1821` парсингом ломается.
 */
const formatYears = (
  birthDate: string | null | undefined,
  deathDate: string | null | undefined,
  bornPrefix: string
): string | null => {
  const born = birthDate?.slice(0, 4);
  const died = deathDate?.slice(0, 4);

  if (born && died) return `${born} — ${died}`;
  if (born) return `${bornPrefix} ${born}`;
  if (died) return `— ${died}`;
  return null;
};

/**
 * Слаг автора на языке страницы.
 *
 * 🔴 Не корневой `author.slug`: он английский на любом языке пути, и ссылка
 * `/ru/author/sun-tzu` вела на страницу, которая живёт по `/ru/author/sun-czy`.
 * Раньше это разрешалось фолбэком, теперь неразрешимый слаг — честный 404,
 * то есть та же ссылка просто сломалась бы.
 */
export const resolveAuthorSlug = (author: AuthorListItem, lang: SupportedLang): string | null =>
  author.translations?.find((t) => t.language === lang)?.slug || null;

export const AuthorCard: FC<AuthorCardProps> = ({ author, lang, labels }) => {
  const slug = resolveAuthorSlug(author, lang);
  // Автора без слага на этом языке показывать некуда: страницы у него здесь нет.
  if (!slug) return null;

  const years = formatYears(author.birthDate, author.deathDate, labels.bornPrefix);
  const booksLabel = pluralize(author.booksCount, lang, labels.books);
  // Неизвестное число — не ноль. Счётчика нет в ответе → плашки нет, но и
  // «0 аудиокниг» мы не утверждаем: подстановка нуля превратила бы недоступный
  // счётчик в уверенное отрицание. Плашка появляется только на честном числе.
  const audioCount = typeof author.audioCount === 'number' ? author.audioCount : null;
  const audioLabel = audioCount === null ? '' : pluralize(audioCount, lang, labels.audio);
  const photoUrl = author.photoUrl || null;

  return (
    <Link className={styles.card} href={`/${lang}/author/${slug}`}>
      <span className={styles.portrait}>
        {photoUrl ? (
          <Image
            alt={author.name}
            className={styles.photo}
            height={PORTRAIT_SIZE}
            loading="lazy"
            sizes={PORTRAIT_SIZES}
            src={photoUrl}
            unoptimized={!isOptimizableHost(photoUrl)}
            width={PORTRAIT_SIZE}
          />
        ) : (
          <User className={styles.portraitIcon} size={40} />
        )}
      </span>

      <h3 className={styles.name}>{author.name}</h3>

      {years && <p className={styles.years}>{years}</p>}

      {author.shortBio && <p className={styles.bio}>{author.shortBio}</p>}

      <span className={styles.spacer} />

      <span className={styles.counters}>
        <span>
          {author.booksCount} {booksLabel}
        </span>
        {audioCount !== null && audioCount > 0 && (
          <span className={styles.audioBadge} title={`${audioCount} ${audioLabel}`}>
            ♪ {audioCount} {labels.audioBadge}
          </span>
        )}
      </span>
    </Link>
  );
};
