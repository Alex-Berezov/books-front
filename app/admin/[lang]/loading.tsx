import styles from './loading.module.scss';

/**
 * Loading состояние для админки
 *
 * Показывается при загрузке страниц в admin панели
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
