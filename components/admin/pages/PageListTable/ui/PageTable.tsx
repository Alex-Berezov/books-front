import type { FC } from 'react';
import Link from 'next/link';
import { EditButton, DeleteButton } from '@/components/admin/common/ActionButtons';
import type { PageTableProps } from '../PageListTable.types';
import styles from '../PageListTable.module.scss';

/**
 * Таблица со списком страниц
 *
 * Отображает таблицу с заголовком, slug, языком, статусом, датой обновления и действиями
 */
export const PageTable: FC<PageTableProps> = (props) => {
  const { pages, lang, isDeletingPage, onDelete } = props;

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Title</th>
            <th>Slug</th>
            <th>Language</th>
            <th>Status</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((pageItem) => (
            <tr key={pageItem.id}>
              <td className={styles.titleCell}>
                <Link href={`/admin/${lang}/pages/${pageItem.id}`} className={styles.titleLink}>
                  {pageItem.title}
                </Link>
              </td>
              <td className={styles.slugCell}>
                <code>{pageItem.slug}</code>
              </td>
              <td className={styles.langCell}>
                <span className={styles.langBadge}>{pageItem.language.toUpperCase()}</span>
              </td>
              <td className={styles.statusCell}>
                <span className={`${styles.statusBadge} ${styles[pageItem.status]}`}>
                  {pageItem.status}
                </span>
              </td>
              <td className={styles.dateCell}>
                {new Date(pageItem.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </td>
              <td className={styles.actionsCell}>
                <div className={styles.actions}>
                  <EditButton href={`/admin/${lang}/pages/${pageItem.id}`} />
                  <DeleteButton
                    onClick={() => onDelete(pageItem.id, pageItem.title)}
                    disabled={isDeletingPage}
                    title="Delete page"
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
