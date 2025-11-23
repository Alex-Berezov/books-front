import Link from 'next/link';
import styles from './not-found.module.scss';

export default function NotFound() {
  return (
    <div className={styles.notFoundContainer}>
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link href="/en" className={styles.homeLink}>
        Go to Homepage
      </Link>
    </div>
  );
}
