import type { FC } from 'react';
import { Eye, Headphones, FileText, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { SupportedLang } from '@/lib/i18n/lang';
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
            const status = displayVersion?.status || 'draft';

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

                {/* Updated */}
                <td className={styles.dateCell}>{updatedDate}</td>

                {/* Status */}
                <td className={styles.statusCell}>
                  <span className={`${styles.statusBadge} ${styles[status]}`}>{status}</span>
                </td>

                {/* Actions */}
                <td className={styles.actionsCell}>
                  <div className={styles.actions}>
                    <Link
                      href={`/admin/${lang}/books/versions/${displayVersion?.id || 'new'}?bookId=${book.id}`}
                      className={styles.actionButton}
                      title="Edit"
                    >
                      <Edit size={16} />
                    </Link>
                    {isAdmin && (
                      <button
                        onClick={() => onDeleteClick(book.id, displayTitle)}
                        className={`${styles.actionButton} ${styles.delete}`}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
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
