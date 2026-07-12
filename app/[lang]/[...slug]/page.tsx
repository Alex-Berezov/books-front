import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isSupportedLang, type SupportedLang } from '@/lib/i18n/lang';
import styles from './not-found.module.scss';

type Props = {
  params: Promise<{ lang: string }>;
};

const NAV_LINKS: Array<{ key: string; label: string }> = [
  { key: 'categories', label: 'categories' },
  { key: 'genres', label: 'genres' },
  { key: 'collections', label: 'collections' },
  { key: 'tags', label: 'tags' },
];

export default async function CatchAllNotFound({ params }: Props) {
  const { lang } = await params;

  if (!isSupportedLang(lang)) {
    notFound();
  }

  const dict = getDictionary(lang as SupportedLang);

  return (
    <div className={styles.container}>
      <div className={styles.code}>404</div>
      <h1 className={styles.title}>{dict.notFound?.title || 'Page Not Found'}</h1>
      <p className={styles.subtitle}>{dict.notFound?.subtitle || ''}</p>
      <div className={styles.actions}>
        <Link href={`/${lang}`} className={styles.primaryBtn}>
          {dict.notFound?.backHome || 'Go to Homepage'}
        </Link>
        <Link href={`/${lang}/catalog`} className={styles.secondaryBtn}>
          {dict.notFound?.browseCatalog || 'Browse Catalog'}
        </Link>
      </div>
      <div className={styles.links}>
        <p className={styles.linksTitle}>{dict.notFound?.popularPages || 'Popular pages'}</p>
        <div className={styles.linksList}>
          {NAV_LINKS.map((link) => (
            <Link key={link.key} href={`/${lang}/${link.key}`} className={styles.link}>
              {dict.notFound?.[link.key as keyof typeof dict.notFound] || link.key}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
