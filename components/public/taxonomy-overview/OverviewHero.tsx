import type { FC } from 'react';
import styles from './OverviewHero.module.scss';

export interface OverviewHeroProps {
  h1: string;
  shortDescription?: string | null;
}

export const OverviewHero: FC<OverviewHeroProps> = ({ h1, shortDescription }) => {
  return (
    <div className={styles.hero}>
      <h1 className={styles.h1}>{h1}</h1>
      {shortDescription && <p className={styles.shortDescription}>{shortDescription}</p>}
    </div>
  );
};
