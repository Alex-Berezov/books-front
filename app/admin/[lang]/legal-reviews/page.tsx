'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { LawyersDirectory } from '@/components/admin/rights-lawyer/LawyersDirectory/LawyersDirectory';
import { LegalReviewsInbox } from '@/components/admin/rights-lawyer/LegalReviewsInbox/LegalReviewsInbox';
import styles from './page.module.scss';

type TabKey = 'reviews' | 'lawyers';

/**
 * Phase 19 admin section. Reachable by admin, content manager and lawyer — the sidebar and the
 * middleware agree on that; the lawyers directory tab is admin-only.
 */
export default function LegalReviewsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.roles?.includes('admin') ?? false;
  const [tab, setTab] = useState<TabKey>('reviews');

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Legal Reviews</h1>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'reviews' ? styles.active : ''}`}
          onClick={() => setTab('reviews')}
        >
          Проверки
        </button>
        {isAdmin && (
          <button
            type="button"
            className={`${styles.tab} ${tab === 'lawyers' ? styles.active : ''}`}
            onClick={() => setTab('lawyers')}
          >
            Юристы
          </button>
        )}
      </div>

      {tab === 'reviews' ? <LegalReviewsInbox /> : isAdmin && <LawyersDirectory />}
    </div>
  );
}
