'use client';

import { useEffect } from 'react';
import styles from './error.module.scss';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className={styles.errorContainer}>
          <h1>Something went wrong!</h1>
          <p>{error.message || 'An unexpected error occurred.'}</p>
          <button onClick={reset} className={styles.retryButton}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
