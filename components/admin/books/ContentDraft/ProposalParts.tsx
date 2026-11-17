'use client';

import type { FC } from 'react';
import { Button } from '@/components/admin/common/Button';
import type { ProposalContent } from './BlockItemCard';
import styles from './ContentDraft.module.scss';
import { refusalText } from './contentDraft.utils';

/** Ссылки на проверенные источники: открываются в новой вкладке, без передачи адреса страницы. */
export const SourceLinks: FC<{ sources: { url: string; title: string }[] }> = ({ sources }) => (
  <ul className={styles.list}>
    {sources.map((s) => (
      <li key={s.url}>
        <a href={s.url} target="_blank" rel="noopener noreferrer nofollow">
          {s.title}
        </a>
      </li>
    ))}
  </ul>
);

/** «Verify facts»: код проверил, что источник открылся и он про эту книгу, но не что он говорит то же. */
export const VerifyFactsNote: FC = () => (
  <p className={styles.verify}>
    Verify facts: the code checked that each source opens and is about this book, not that it says
    the same. Check dates and names against the sources.
  </p>
);

/** Отказ чтения содержимого предложения с «Retry» и пометка загрузки; `refusal` — подпись отказа хода. */
export const ProposalStatus: FC<{
  content: Pick<ProposalContent<unknown>, 'wanted' | 'error' | 'loading' | 'retry'>;
  refusal?: (error: unknown) => string;
}> = ({ content, refusal = refusalText }) => (
  <>
    {content.wanted && content.error ? (
      <p className={styles.error} role="alert">
        Could not load the proposal: {refusal(content.error)}{' '}
        <Button variant="link" onClick={content.retry}>
          Retry
        </Button>
      </p>
    ) : null}
    {content.wanted && content.loading && <p className={styles.hint}>Loading the proposal…</p>}
  </>
);
