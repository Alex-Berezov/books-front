import styles from './loading.module.scss';

/**
 * Loading state for admin panel
 *
 * Displayed when loading pages in admin panel
 */
export default function AdminLoading() {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.spinner}>
        <div className={styles.spinnerRing}></div>
        <div className={styles.spinnerRing}></div>
        <div className={styles.spinnerRing}></div>
      </div>
      <p className={styles.loadingText}>Loading...</p>
    </div>
  );
}
