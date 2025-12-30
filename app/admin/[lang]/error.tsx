'use client';

import { useEffect } from 'react';
import { Button } from '@/components/common/Button';
import styles from './error.module.scss';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Admin Panel Error:', error);
  }, [error]);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Something went wrong!</h2>
      <p className={styles.message}>
        An unexpected error occurred in the admin panel.
        {error.message && <br />}
        {error.message && <span style={{ fontSize: '0.9em', opacity: 0.8 }}>{error.message}</span>}
      </p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Reload Page
        </Button>
        <Button variant="primary" onClick={() => reset()}>
          Try Again
        </Button>
      </div>
    </div>
  );
}
