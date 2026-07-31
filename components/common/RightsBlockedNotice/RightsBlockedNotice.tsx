'use client';

import type { FC } from 'react';
import { Globe2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/common/Button';
import { useTranslation } from '@/lib/i18n/useTranslation';
import styles from './RightsBlockedNotice.module.scss';

export interface RightsBlockedNoticeProps {
  /** Language prefix of the current route, used to build the link back to the book card. */
  lang: string;
  /** Slug of the book the reader or player was opened for. */
  bookSlug: string;
}

/**
 * Screen shown instead of the reader or the player when the backend answers 451.
 *
 * The backend returns 451 for two reasons — the visitor's market is closed by the rights profile
 * (`GEO_BLOCKED_BY_RIGHTS`) and a rightsholder claim blocks the work (`BLOCKED_BY_RIGHTS_CLAIM`).
 * Both produce exactly this screen: Phase 16 forbids disclosing the claim, the claimant or the
 * reason outward, so the wording must not let a reader tell the two cases apart (ADR-012).
 *
 * The book card itself stays reachable — only reading and listening are blocked — so the screen
 * always offers the way back to it.
 */
export const RightsBlockedNotice: FC<RightsBlockedNoticeProps> = (props) => {
  const { lang, bookSlug } = props;
  const { t } = useTranslation();

  return (
    <section className={styles.notice} role="alert" aria-live="polite">
      <Globe2 size={48} className={styles.icon} aria-hidden="true" />
      <h1 className={styles.title}>{t('rightsBlocked.title')}</h1>
      <p className={styles.message}>{t('rightsBlocked.message')}</p>
      <div className={styles.actions}>
        <Link href={`/${lang}/book/${bookSlug}`}>
          <Button variant="secondary" size="md">
            {t('rightsBlocked.backToBook')}
          </Button>
        </Link>
        <Link href={`/${lang}/catalog`}>
          <Button variant="ghost" size="md">
            {t('rightsBlocked.browseCatalog')}
          </Button>
        </Link>
      </div>
    </section>
  );
};
