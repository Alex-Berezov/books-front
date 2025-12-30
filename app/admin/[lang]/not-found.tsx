import Link from 'next/link';
import { Button } from '@/components/common/Button';
import styles from './not-found.module.scss';

export default function AdminNotFound() {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Page Not Found</h2>
      <p className={styles.message}>Could not find the requested resource.</p>
      <div className={styles.actions}>
        <Link href="/admin/en">
          <Button variant="primary">Return to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
