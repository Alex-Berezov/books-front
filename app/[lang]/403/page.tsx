import Link from 'next/link';
import { PageBackButton } from '@/components/public/navigation';
import { getDictionary } from '@/lib/i18n/dictionaries';
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
  const dict = getDictionary(lang);

  return (
    <div className={styles.container}>
      <PageBackButton lang={lang} />

      <h1 className={styles.title}>403</h1>
      <p className={styles.message}>{dict.forbidden.title}</p>
      <p className={styles.description}>{dict.forbidden.description}</p>
      <p className={styles.description}>{dict.forbidden.adminOnly}</p>
      <Link href={`/${lang}`} className={styles.link}>
        {dict.notFound.backHome}
      </Link>
    </div>
  );
}
