import { getDictionary } from '@/lib/i18n/dictionaries';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './StarRating.module.scss';

interface StarRatingServerProps {
  rating: number;
  size?: 'sm' | 'md';
  lang?: SupportedLang;
}

function StarIcon({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'var(--gold)' : 'transparent'}
      stroke={filled ? 'var(--gold)' : 'var(--public-border)'}
      strokeWidth="2"
      className={styles.starIcon}
      aria-hidden="true"
      focusable="false"
    >
      <polygon points="12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9" />
    </svg>
  );
}

export function StarRatingServer({ rating, size = 'sm', lang = 'en' }: StarRatingServerProps) {
  const starSize = size === 'sm' ? 12 : 16;
  const roundedRating = Math.round(rating);
  const dict = getDictionary(lang);
  const ratingLabel = dict.a11y.ratingOutOfFive.replace('{rating}', String(rating));

  return (
    <div className={styles.container} role="img" aria-label={ratingLabel}>
      <div className={styles.stars} aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon key={star} filled={star <= roundedRating} size={starSize} />
        ))}
      </div>
    </div>
  );
}
