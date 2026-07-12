import Link from 'next/link';
import styles from './not-found.module.scss';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.code}>404</div>
      <h1 className={styles.title}>Page Not Found</h1>
      <p className={styles.subtitle}>
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <div className={styles.actions}>
        <Link href="/en" className={styles.primaryBtn}>
          Go to Homepage
        </Link>
        <Link href="/en/catalog" className={styles.secondaryBtn}>
          Browse Catalog
        </Link>
      </div>
    </div>
  );
}
