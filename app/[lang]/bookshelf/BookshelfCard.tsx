'use client';

import type { FC, MouseEvent } from 'react';
import { Headphones, PlayCircle, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useProgress } from '@/api/hooks/useProgress';
import { Button } from '@/components/common/Button';
import { BookOutlinedIcon } from '@/components/common/icons/BookOutlinedIcon';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useProgressIdentity } from '@/lib/reading-progress';
import { isOptimizableHost } from '@/lib/utils/image-host';
import type { BookshelfItemDto } from '@/types/api-schema';
import styles from './bookshelf.module.scss';

// Скругление заливки — атрибутом, а не CSS-свойством `rx`: Safari его не применяет.
// Значение — прежний инлайн-стиль полосы (`borderRadius: 3`).
const PROGRESS_RADIUS = 3;

/** Ширина обложки на полке — `.cover` в модуле. */
const COVER_SIZES = '90px';

interface BookshelfCardProps {
  item: BookshelfItemDto;
  onRemove: (versionId: string, title: string) => void;
  lang: string;
}

/** Карточка одной книги на полке. */
export const BookshelfCard: FC<BookshelfCardProps> = ({ item, onRemove, lang }) => {
  const version = item.bookVersion;
  const bookSlug = version.slug || version.book?.slug || version.bookId;
  const { t } = useTranslation();

  // Query progress for this specific version.
  // Владелец в ключе кэша обязателен: на общем компьютере следующий
  // вошедший иначе увидит чужой прогресс на своей полке.
  // 🔴 Ждём пригодной сессии, а не просто наличия версии. Пока сессия
  // грузится, `progressOwnerId` ещё `null` — запрос ушёл бы под ключом без
  // владельца, а после ответа сессии ключ меняется и каждая карточка
  // запрашивала бы прогресс дважды: на полке из двадцати книг — сорок запросов.
  const { target: progressTarget, userId: progressOwnerId } = useProgressIdentity();
  const { data: progress } = useProgress(version.id, progressOwnerId ?? undefined, {
    enabled: !!version.id && progressTarget === 'server',
  });

  const isAudio = version.type === 'audio';

  // Calculate percentage
  let progressPct = 0;
  let progressLabel = '';

  const chapterAbbr = t('bookshelf.card.chapterAbbr');

  if (progress) {
    if (isAudio) {
      const minutes = Math.floor(progress.position / 60);
      const seconds = Math.floor(progress.position % 60);
      const duration = t('bookshelf.card.durationShort', { minutes, seconds });
      progressLabel = progress.audioChapterNumber
        ? `${chapterAbbr} ${progress.audioChapterNumber} • ${duration}`
        : duration;
      progressPct = 50; // default indicator for audiobooks in progress
    } else {
      // Глав не знаем — полосу не двигаем: процент остаётся начальным, а не считается.
      const chaptersCount = version.chaptersCount;
      const chapterIndex = (progress.chapterNumber || 1) - 1;
      const positionOffset = typeof progress.position === 'number' ? progress.position : 0;
      if (chaptersCount && chaptersCount > 0) {
        progressPct = Math.min(
          100,
          Math.round(((chapterIndex + positionOffset) / chaptersCount) * 100)
        );
      }
      progressLabel = progress.chapterNumber
        ? `${chapterAbbr} ${progress.chapterNumber} • ${progressPct}%`
        : `${progressPct}%`;
    }
  }

  const handleRemoveClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove(version.id, version.title);
  };

  return (
    <div className={styles.card}>
      <Link href={`/${lang}/book/${bookSlug}`} className={styles.coverLink}>
        <div className={styles.cover}>
          {version.coverImageUrl ? (
            // Обложка картинкой, как в карточках каталога: `fill` и `object-fit: cover`
            // повторяют прежний фон `background-size: cover` без инлайн-стиля.
            <Image
              src={version.coverImageUrl}
              alt={version.title}
              className={styles.coverImage}
              fill
              sizes={COVER_SIZES}
              unoptimized={!isOptimizableHost(version.coverImageUrl)}
            />
          ) : (
            <span className={styles.coverLetter}>{version.title?.[0]}</span>
          )}
        </div>
      </Link>

      <div className={styles.cardInfo}>
        <h3 className={styles.cardTitle}>
          <Link href={`/${lang}/book/${bookSlug}`}>{version.title}</Link>
        </h3>
        <p className={styles.cardAuthor}>{version.author}</p>

        <div className={styles.badgeGroup}>
          {isAudio ? (
            <span className={`${styles.badge} ${styles.badgeAudio}`}>
              <Headphones size={12} />
              {t('bookshelf.card.audiobook')}
            </span>
          ) : (
            <span className={`${styles.badge} ${styles.badgeText}`}>
              <BookOutlinedIcon className={styles.badgeIcon} />
              {t('bookshelf.card.text')}
            </span>
          )}

          {version.isFree && (
            <span className={`${styles.badge} ${styles.badgeFree}`}>
              {t('bookshelf.card.free')}
            </span>
          )}
        </div>

        {progress && (
          <div className={styles.progressSection}>
            <div className={styles.progressLabel}>
              <span>{t('bookshelf.card.readingProgress')}</span>
              <span>{progressLabel}</span>
            </div>
            {/* Ширина заливки — атрибут SVG, а не инлайн-стиль: значение приходит из данных. */}
            <svg className={styles.progressTrack} aria-hidden="true" focusable="false">
              <rect
                className={
                  isAudio
                    ? `${styles.progressFill} ${styles.progressFillAudio}`
                    : styles.progressFill
                }
                width={`${isAudio ? 100 : progressPct}%`}
                height="100%"
                rx={PROGRESS_RADIUS}
                ry={PROGRESS_RADIUS}
              />
            </svg>
          </div>
        )}

        <div className={styles.actions}>
          {isAudio ? (
            <Link href={`/${lang}/book/${bookSlug}/listen`} passHref legacyBehavior>
              <Button
                variant="primary"
                size="sm"
                className={`${styles.actionBtn} ${styles.continueBtn}`}
              >
                <PlayCircle size="1em" className={styles.inlineIcon} aria-hidden="true" />{' '}
                {t('bookshelf.card.listen')}
              </Button>
            </Link>
          ) : (
            <Link href={`/${lang}/book/${bookSlug}/read`} passHref legacyBehavior>
              <Button
                variant="primary"
                size="sm"
                className={`${styles.actionBtn} ${styles.continueBtn}`}
              >
                <BookOutlinedIcon className={styles.inlineIcon} />{' '}
                {progress ? t('bookshelf.card.continue') : t('bookshelf.card.start')}
              </Button>
            </Link>
          )}

          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Trash2 size="1em" aria-hidden="true" />}
            ariaLabel={t('bookshelf.removeBtn')}
            className={styles.removeBtn}
            onClick={handleRemoveClick}
          />
        </div>
      </div>
    </div>
  );
};
