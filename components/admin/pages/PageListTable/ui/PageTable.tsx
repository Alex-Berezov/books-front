import type { FC } from 'react';
import Link from 'next/link';
import { EditButton, DeleteButton } from '@/components/admin/common/ActionButtons';
import { Skeleton } from '@/components/admin/shared';
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
  search?: string;
  statusFilter?: PageTableProps['statusFilter'];
}

/**
 * Совпал ли перевод с активным фильтром - теми же условиями, что применил
 * бэкенд: подстрока в заголовке или слаге плюс статус, оба через И.
 */
const matchesFilter = (
  page: PageGroup['pages'][number],
  search: string | undefined,
  statusFilter: PageTableProps['statusFilter']
): boolean => {
  const term = search?.trim().toLowerCase();
  if (term && !page.title.toLowerCase().includes(term) && !page.slug.toLowerCase().includes(term)) {
    return false;
  }
  return !(statusFilter && statusFilter !== 'all' && page.status !== statusFilter);
};

const PageTableRow: FC<PageTableRowProps> = ({
  group,
  lang,
  isDeletingPage,
  onDelete,
  search,
  statusFilter,
}) => {
  // Строку представляет тот перевод, из-за которого группа вообще попала
  // в выдачу: бэкенд отбирает группу по любому совпавшему переводу и состав
  // группы не сужает. Иначе поиск «Политика» показывал бы строку
  // «Privacy Policy», а фильтр «Draft» - заголовок и дату опубликованной
  // версии, и экран читался бы как несработавший фильтр (`LEGACY-371`).
  const matched = group.pages.filter((p) => matchesFilter(p, search, statusFilter));
  const candidates = matched.length > 0 ? matched : group.pages;

  const mainPage =
    candidates.find((p) => p.language === lang) ||
    candidates.find((p) => p.language === 'en') ||
    candidates[0];

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
export const PageTable: FC<PageTableProps & { isLoading?: boolean }> = ({
  groups,
  lang,
  isDeletingPage,
  onDelete,
  isLoading,
  search,
  statusFilter,
}) => {
  if (isLoading) {
    return (
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Slug</th>
              <th>Translations</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, index) => (
              <tr key={index}>
                <td>
                  <Skeleton variant="text" width="80%" />
                </td>
                <td>
                  <Skeleton variant="text" width="60%" />
                </td>
                <td>
                  <Skeleton variant="text" width={120} />
                </td>
                <td>
                  <Skeleton variant="text" width={80} />
                </td>
                <td>
                  <Skeleton variant="text" width={100} />
                </td>
                <td>
                  <Skeleton variant="button" width={80} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

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
              search={search}
              statusFilter={statusFilter}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
