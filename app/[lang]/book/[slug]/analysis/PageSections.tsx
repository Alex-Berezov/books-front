import { Fragment, type ReactNode } from 'react';
import styles from './analysis.module.scss';
import { Section } from './AnalysisBlocks';

/**
 * Раздел страницы книги с оглавлением по h2 (анализ, мир книги): `standalone` - раздел рисует свой
 * заголовок сам (общий блок вроде `QuotesBlock` или FAQ).
 */
export interface PageSection {
  id: string;
  title: string;
  body: ReactNode;
  standalone?: boolean;
}

/**
 * Оглавление по h2 и разделы страницы (`F03` анализ, `F08` мир книги): оглавление строится из того же
 * списка, что и разделы, - раздел без данных в него не попадает вовсе. Серверный: весь текст в HTML
 * ответа. Разделов нет - ничего.
 */
export function PageSections({
  sections,
  tocTitle,
  tocId,
}: {
  sections: readonly PageSection[];
  tocTitle: string;
  tocId: string;
}) {
  if (sections.length === 0) return null;
  return (
    <>
      <nav className={styles.toc} aria-labelledby={tocId}>
        <p id={tocId} className={styles.tocTitle}>
          {tocTitle}
        </p>
        <ol className={styles.tocList}>
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.title}</a>
            </li>
          ))}
        </ol>
      </nav>
      {sections.map((s) =>
        s.standalone ? (
          <Fragment key={s.id}>{s.body}</Fragment>
        ) : (
          <Section key={s.id} id={s.id} title={s.title}>
            {s.body}
          </Section>
        )
      )}
    </>
  );
}
