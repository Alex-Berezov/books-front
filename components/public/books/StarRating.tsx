'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { getLocaleTag } from '@/lib/i18n/lang';
import { useTranslation } from '@/lib/i18n/useTranslation';
import styles from './StarRating.module.scss';

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: 'sm' | 'md';
  showCount?: boolean;
  interactive?: boolean;
  onRate?: (rating: number) => void;
  disabled?: boolean;
}

export function StarRating({
  rating,
  count,
  size = 'sm',
  showCount = true,
  interactive = false,
  onRate,
  disabled = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const { t, lang } = useTranslation();
  const stars = [1, 2, 3, 4, 5];

  const displayRating = hoverRating !== null ? hoverRating : rating;
  const roundedRating = Math.round(displayRating);

  const ratingLabel = t('a11y.ratingOutOfFive', { rating });

  if (interactive) {
    return (
      <div className={styles.container}>
        <fieldset className={styles.fieldset}>
          <legend className="sr-only">{ratingLabel}</legend>
          <div
            className={styles.stars}
            aria-busy={disabled}
            onMouseLeave={() => !disabled && setHoverRating(null)}
          >
            {stars.map((star) => {
              const isActive = star <= roundedRating;
              return (
                <label
                  key={star}
                  className={`${styles.starLabel} ${isActive ? styles.filled : styles.empty}`}
                >
                  <input
                    type="radio"
                    name="book-rating"
                    value={star}
                    checked={star === Math.round(rating)}
                    onChange={() => onRate?.(star)}
                    disabled={disabled}
                    className="sr-only"
                  />
                  <span className="sr-only">
                    {star === 1 ? t('a11y.starOne') : t('a11y.starsCount', { count: star })}
                  </span>
                  <Star
                    size={size === 'sm' ? 12 : 16}
                    className={styles.starIcon}
                    aria-hidden="true"
                    focusable="false"
                    onMouseEnter={() => !disabled && setHoverRating(star)}
                  />
                </label>
              );
            })}
          </div>
        </fieldset>
        {showCount && count !== undefined && (
          <span className={styles.count}>({count.toLocaleString(getLocaleTag(lang))})</span>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container} role="img" aria-label={ratingLabel}>
      <div className={styles.stars} aria-hidden="true">
        {stars.map((star) => (
          <Star
            key={star}
            size={size === 'sm' ? 12 : 16}
            className={`${styles.starIcon} ${star <= roundedRating ? styles.filled : styles.empty}`}
            aria-hidden="true"
            focusable="false"
          />
        ))}
      </div>
      {showCount && count !== undefined && (
        <span className={styles.count}>({count.toLocaleString()})</span>
      )}
    </div>
  );
}
