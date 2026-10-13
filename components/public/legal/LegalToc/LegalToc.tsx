import { getDictionary } from '@/lib/i18n/dictionaries';
import type { LegalTocProps } from './LegalToc.types';
import styles from './LegalToc.module.scss';

/** Оглавление длинной правовой страницы: якоря на заголовки разделов (`product.md` §1). */
export const LegalToc = ({ lang, sections }: LegalTocProps) => {
  const label = getDictionary(lang).common.tableOfContents;

  return (
    <nav aria-label={label} className={styles.toc}>
      <p className={styles.title}>{label}</p>
      <ol className={styles.list}>
        {sections.map((section) => (
          <li key={section.id}>
            <a href={`#${section.id}`} className={styles.link}>
              {section.heading}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
};
