import type { FC } from 'react';
import styles from './AuthorsHub.module.scss';

/** Сколько карточек рисует скелетон — ровно страница по умолчанию. */
const SKELETON_CARDS = 24;

/**
 * Состояние загрузки хаба: круг и две полосы вместо каждой карточки.
 *
 * Рисуется из `app/[lang]/authors/loading.tsx`, пока серверный компонент ждёт
 * ответа. Пульсация выключается при `prefers-reduced-motion`, сам скелетон
 * остаётся — он несёт смысл «сейчас появится сетка», а не украшает.
 */
export const AuthorsSkeleton: FC = () => (
  <div className={styles.page}>
    <div className={styles.container}>
      <div className={styles.grid}>
        {Array.from({ length: SKELETON_CARDS }, (_, at) => (
          <div className={styles.skeletonCard} key={at}>
            <span className={styles.skeletonPortrait} />
            <span className={styles.skeletonLine} />
            <span className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
          </div>
        ))}
      </div>
    </div>
  </div>
);
