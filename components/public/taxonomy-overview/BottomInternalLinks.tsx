import type { FC } from 'react';
import Link from 'next/link';
import type { TaxonomyType } from './TaxonomyOverviewConfig';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './BottomInternalLinks.module.scss';

export interface BottomInternalLinksProps {
  lang: SupportedLang;
  currentType: TaxonomyType;
}

const ALL_LINKS: { type: TaxonomyType; label: string; href: string }[] = [
  { type: 'category', label: 'Catalog', href: '/catalog' },
  { type: 'category', label: 'Categories', href: '/categories' },
  { type: 'genre', label: 'Genres', href: '/genres' },
  { type: 'collection', label: 'Collections', href: '/collections' },
  { type: 'tag', label: 'Tags', href: '/tags' },
  { type: 'category', label: 'Audiobooks', href: '/audiobooks' },
  { type: 'category', label: 'Popular', href: '/popular' },
  { type: 'category', label: 'New Releases', href: '/new-releases' },
];

const EXCLUDED_ROUTES: Record<TaxonomyType, string> = {
  category: '/categories',
  genre: '/genres',
  collection: '/collections',
  tag: '/tags',
};

export const BottomInternalLinks: FC<BottomInternalLinksProps> = ({ lang, currentType }) => {
  const currentRoute = EXCLUDED_ROUTES[currentType];

  return (
    <div className={styles.bottomLinks}>
      <h2 className={styles.title}>Explore more on Bibliaris</h2>
      <nav className={styles.links}>
        {ALL_LINKS.map((link, index) => {
          const href = `/${lang}${link.href}`;
          const isCurrent = link.href === currentRoute;

          return (
            <span key={link.href}>
              {isCurrent ? (
                <span className={`${styles.link} ${styles.active}`}>{link.label}</span>
              ) : (
                <Link href={href} className={styles.link}>
                  {link.label}
                </Link>
              )}
              {index < ALL_LINKS.length - 1 && <span className={styles.separator}> | </span>}
            </span>
          );
        })}
      </nav>
    </div>
  );
};
