import type { HeadingAnchor } from '@/lib/utils/heading-anchors';
import styles from './summary.module.scss';

interface SummarySidebarProps {
  infoTitle: string;
  facts: { label: string; value: string }[];
  tocTitle: string;
  /** Разделы `h2` пересказа; пустой список - оглавления нет. */
  toc: HeadingAnchor[];
}

/** Боковая колонка пересказа: сведения о книге и оглавление по разделам. */
export function SummarySidebar({ infoTitle, facts, tocTitle, toc }: SummarySidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <section className={styles.sideCard}>
        <h2 className={styles.sideTitle}>{infoTitle}</h2>
        <dl className={styles.facts}>
          {facts.map((fact) => (
            <div key={fact.label} className={styles.fact}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      {toc.length > 0 && (
        <nav className={styles.sideCard} aria-label={tocTitle}>
          <h2 className={styles.sideTitle}>{tocTitle}</h2>
          <ol className={styles.toc}>
            {toc.map((anchor) => (
              <li key={anchor.id}>
                <a href={`#${anchor.id}`}>{anchor.text}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}
    </aside>
  );
}
