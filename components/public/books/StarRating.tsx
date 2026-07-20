'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
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
  const stars = [1, 2, 3, 4, 5];

  const displayRating = hoverRating !== null ? hoverRating : rating;
  const roundedRating = Math.round(displayRating);

  const ratingLabel = `Rating ${rating} out of 5`;

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
                    {star} {star === 1 ? 'star' : 'stars'}
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
          <span className={styles.count}>({count.toLocaleString()})</span>
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
