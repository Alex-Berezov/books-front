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
}

export function StarRating({
  rating,
  count,
  size = 'sm',
  showCount = true,
  interactive = false,
  onRate,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const stars = [1, 2, 3, 4, 5];

  const displayRating = hoverRating !== null ? hoverRating : rating;
  const roundedRating = Math.round(displayRating);

  return (
    <div className={styles.container}>
      <div className={styles.stars} onMouseLeave={() => interactive && setHoverRating(null)}>
        {stars.map((star) => (
          <Star
            key={star}
            size={size === 'sm' ? 12 : 16}
            className={`${styles.starIcon} ${star <= roundedRating ? styles.filled : styles.empty}`}
            style={interactive ? { cursor: 'pointer' } : undefined}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onClick={() => {
              if (interactive && onRate) {
                onRate(star);
              }
            }}
          />
        ))}
      </div>
      {showCount && count !== undefined && (
        <span className={styles.count}>({count.toLocaleString()})</span>
      )}
    </div>
  );
}
