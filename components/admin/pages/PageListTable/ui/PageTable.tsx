import type { FC } from 'react';
import Link from 'next/link';
import { EditButton, DeleteButton } from '@/components/admin/common/ActionButtons';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import type { PageTableProps } from '../PageListTable.types';
import type { PageGroup } from '@/types/api-schema';
import styles from '../PageListTable.module.scss';

/**
 * Helper to format date
 */
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

interface PageTableRowProps {
  group: PageGroup;
  lang: PageTableProps['lang'];
  isDeletingPage: boolean;
  onDelete: PageTableProps['onDelete'];
}

const PageTableRow: FC<PageTableRowProps> = ({ group, lang, isDeletingPage, onDelete }) => {
  // Determine main page to display (priority: current lang -> en -> first)
  const mainPage =
    group.pages.find((p) => p.language === lang) ||
    group.pages.find((p) => p.language === 'en') ||
    group.pages[0];

  if (!mainPage) {
    return null;
  }

  return (
    <tr>
      <td className={styles.titleCell}>
        <Link href={`/admin/${lang}/pages/${mainPage.id}`} className={styles.titleLink}>
          {mainPage.title}
        </Link>
      </td>
      <td className={styles.slugCell}>
        <code>{mainPage.slug}</code>
      </td>
      <td className={styles.translationsCell}>
        <div className={styles.translationsList}>
          {SUPPORTED_LANGS.map((l) => {
            const translation = group.pages.find((p) => p.language === l);

            if (translation) {
              return (
                <Link
                  key={l}
                  href={`/admin/${lang}/pages/${translation.id}`}
                  className={`${styles.langBadge} ${styles.langBadgeLink} ${styles[translation.status]}`}
                  title={`${l.toUpperCase()}: ${translation.status}`}
                >
                  {l.toUpperCase()}
                </Link>
              );
            }

            return (
              <Link
                key={l}
                href={`/admin/${lang}/pages/new?translationGroupId=${group.translationGroupId}&targetLang=${l}`}
                className={`${styles.langBadge} ${styles.langBadgeCreate}`}
                title={`Create ${l.toUpperCase()} translation`}
              >
                + {l.toUpperCase()}
              </Link>
            );
          })}
        </div>
      </td>
      <td className={styles.dateCell}>{formatDate(mainPage.updatedAt)}</td>
      <td className={styles.actionsCell}>
        <div className={styles.actions}>
          <EditButton href={`/admin/${lang}/pages/${mainPage.id}`} />
          <DeleteButton
            onClick={() => onDelete(mainPage.id, mainPage.title)}
            disabled={isDeletingPage}
            title="Delete page group"
          />
        </div>
      </td>
    </tr>
  );
};

/**
 * Page List Table
 *
 * Displays a table with title, slug, translations, status, updated date and actions
 */
export const PageTable: FC<PageTableProps> = (props) => {
  const { groups, lang, isDeletingPage, onDelete } = props;

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Title</th>
            <th>Slug</th>
            <th>Translations</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <PageTableRow
              key={group.translationGroupId}
              group={group}
              lang={lang}
              isDeletingPage={isDeletingPage}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
