import type { FC } from 'react';
import styles from './AuthorsHub.module.scss';

/** Сколько карточек рисует скелетон — ровно страница по умолчанию. */
const SKELETON_CARDS = 24;

/**
 * Состояние загрузки хаба: круг и две полосы вместо каждой карточки.
 *
 * Пульсация выключается при `prefers-reduced-motion`, сам скелетон остаётся —
 * он несёт смысл «сейчас появится сетка», а не украшает.
 *
 * ⚠️ Сейчас без потребителей: `app/[lang]/authors/loading.tsx` снят (`T121`, решение
 * арбитра 11.10.2026) — на next 15.5.27 с ним `router.replace` с `?search=` на хабе
 * молча отбрасывался. Вернуть скелетон (`loading.tsx` или `Suspense`) можно только
 * когда механизм в next найден и e2e `authors-hub` («?search=») зелёный с ним на prod-сборке.
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
