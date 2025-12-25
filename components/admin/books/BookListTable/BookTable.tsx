import type { FC } from 'react';
import { Eye, Headphones, FileText } from 'lucide-react';
import Link from 'next/link';
import { EditButton, DeleteButton } from '@/components/admin/common/ActionButtons';
import { LANGUAGE_FLAGS, type SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview } from '@/types/api-schema';
import styles from './BookListTable.module.scss';

interface BookTableProps {
  books: BookOverview[];
  lang: SupportedLang;
  isAdmin: boolean;
  onDeleteClick: (id: string, title: string) => void;
}

export const BookTable: FC<BookTableProps> = (props) => {
  const { books, lang, isAdmin, onDeleteClick } = props;

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>TITLE</th>
            <th>SLUG</th>
            <th>CONTENT</th>
            <th>VERSIONS</th>
            <th>UPDATED</th>
            <th>STATUS</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {books.map((book) => {
            // Find version for current language or fallback to first version
            const currentLangVersion = book.versions?.find((v) => v.language === lang);
            const displayVersion = currentLangVersion || book.versions?.[0];

            // Determine content types available
            const hasText = book.versions?.some((v) => v.type === 'text');
            const hasAudio = book.versions?.some((v) => v.type === 'audio');

            // Determine status
            // const status = displayVersion?.status || 'draft';

            // Determine title
            const displayTitle = displayVersion?.title || book.title || book.slug;

            // Format date
            const updatedDate = new Date(book.updatedAt).toISOString().split('T')[0];

            return (
              <tr key={book.id}>
                {/* Title */}
                <td className={styles.titleCell}>
                  <Link
                    href={`/admin/${lang}/books/versions/${displayVersion?.id || 'new'}?bookId=${book.id}`}
                    className={styles.bookLink}
                  >
                    {displayTitle}
                  </Link>
                </td>

                {/* Slug */}
                <td className={styles.slugCell}>{book.slug}</td>

                {/* Content Icons */}
                <td className={styles.contentCell}>
                  <div className={styles.icons}>
                    <span className={`${styles.icon} ${styles.iconView}`} title="View">
                      <Eye size={16} />
                    </span>
                    {hasAudio && (
                      <span className={`${styles.icon} ${styles.iconAudio}`} title="Audio">
                        <Headphones size={16} />
                      </span>
                    )}
                    {hasText && (
                      <span className={`${styles.icon} ${styles.iconText}`} title="Text">
                        <FileText size={16} />
                      </span>
                    )}
                  </div>
                </td>

                {/* Versions */}
                <td className={styles.versionsCell}>
                  <div className={styles.versionFlags}>
                    {book.versions?.map((version) => {
                      const flag = version.language ? LANGUAGE_FLAGS[version.language] : '🌐';
                      return (
                        <Link
                          key={version.id}
                          href={`/admin/${lang}/books/versions/${version.id}?bookId=${book.id}`}
                          className={styles.versionFlag}
                          title={`${version.title} (${version.language?.toUpperCase()})`}
                        >
                          {flag}
                        </Link>
                      );
                    })}
                  </div>
                </td>

                {/* Updated */}
                <td className={styles.dateCell}>{updatedDate}</td>

                {/* Status */}
                <td className={styles.statusCell}>
                  <div className={styles.statusList}>
                    {book.versions?.map((version) => {
                      const flag = version.language ? LANGUAGE_FLAGS[version.language] : '🌐';
                      const vStatus = version.status || 'draft';
                      return (
                        <div key={version.id} className={styles.statusItem}>
                          <span className={styles.statusLang}>{flag}</span>
                          <span className={`${styles.statusBadge} ${styles[vStatus]}`}>
                            {vStatus}
                          </span>
                        </div>
                      );
                    })}
                    {(!book.versions || book.versions.length === 0) && (
                      <span className={`${styles.statusBadge} ${styles.draft}`}>draft</span>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td className={styles.actionsCell}>
                  <div className={styles.actions}>
                    <EditButton
                      href={`/admin/${lang}/books/versions/${displayVersion?.id || 'new'}?bookId=${book.id}`}
                    />
                    {isAdmin && (
                      <DeleteButton
                        onClick={() => onDeleteClick(book.id, displayTitle)}
                        title="Delete"
                      />
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
