import Link from 'next/link';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './403.module.scss';

type Props = {
  params: Promise<{ lang: SupportedLang }>;
};

/**
 * 403 Page - Access Forbidden
 *
 * Displayed when user doesn't have admin panel access rights
 */
export default async function ForbiddenPage({ params }: Props) {
  const { lang } = await params;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>403</h1>
      <p className={styles.message}>Access Forbidden</p>
      <p className={styles.description}>You don&apos;t have permission to access this page.</p>
      <p className={styles.description}>
        Only administrators and content managers can access the admin panel.
      </p>
      <Link href={`/${lang}`} className={styles.link}>
        Go back to home
      </Link>
    </div>
  );
}
