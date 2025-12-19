'use client';

import type { FC } from 'react';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBook } from '@/api/hooks/useBooks';
import { LANGUAGE_FLAGS, type SupportedLang } from '@/lib/i18n/lang';
import styles from './BookVersionSwitcher.module.scss';

interface BookVersionSwitcherProps {
  bookId: string;
  currentVersionId: string;
  lang: SupportedLang;
}

export const BookVersionSwitcher: FC<BookVersionSwitcherProps> = (props) => {
  const { bookId, currentVersionId, lang } = props;
  const router = useRouter();

  const { data: book, isLoading } = useBook(bookId);

  if (isLoading) {
    return <div className={styles.skeleton} />;
  }

  if (!book) {
    return null;
  }

  const versions = book.versions || [];

  // Sort versions: current language first, then others
  const sortedVersions = [...versions].sort((a, b) => {
    if (a.language === lang) return -1;
    if (b.language === lang) return 1;
    return 0;
  });

  const handleAddVersion = () => {
    const params = new URLSearchParams({
      bookId,
      title: book.title,
      author: book.author,
    });
    router.push(`/admin/${lang}/books/new?${params.toString()}`);
  };

  return (
    <div className={styles.container}>
      <span className={styles.label}>Versions:</span>
      <div className={styles.versionList}>
        {sortedVersions.map((version) => {
          const isActive = version.id === currentVersionId;
          const flag = version.language ? LANGUAGE_FLAGS[version.language] : '🌐';

          return (
            <Link
              key={version.id}
              href={`/admin/${lang}/books/versions/${version.id}?bookId=${bookId}`}
              className={`${styles.versionTab} ${isActive ? styles.active : ''}`}
              title={`${version.title} (${version.language})`}
            >
              <span className={styles.flag}>{flag}</span>
              <span className={styles.langCode}>{version.language?.toUpperCase()}</span>
            </Link>
          );
        })}

        <button
          className={styles.addVersionButton}
          onClick={handleAddVersion}
          title="Add another version"
          type="button"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};
