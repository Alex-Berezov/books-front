import { Spinner } from '@/components/admin/shared';
import styles from './loading.module.scss';

/**
 * Loading state for admin panel
 *
 * Displayed when loading pages in admin panel
 */
export default function AdminLoading() {
  return (
    <div className={styles.loadingContainer}>
      <Spinner size="lg" variant="primary" />
      <p className={styles.loadingText}>Loading...</p>
    </div>
  );
}
