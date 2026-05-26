'use client';

import { Star } from 'lucide-react';
import styles from './StarRating.module.scss';

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: 'sm' | 'md';
  showCount?: boolean;
}

export function StarRating({ rating, count, size = 'sm', showCount = true }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];
  const roundedRating = Math.round(rating);

  return (
    <div className={styles.container}>
      <div className={styles.stars}>
        {stars.map((star) => (
          <Star
            key={star}
            size={size === 'sm' ? 12 : 16}
            className={`${styles.starIcon} ${star <= roundedRating ? styles.filled : styles.empty}`}
          />
        ))}
      </div>
      {showCount && count !== undefined && (
        <span className={styles.count}>({count.toLocaleString()})</span>
      )}
    </div>
  );
}
