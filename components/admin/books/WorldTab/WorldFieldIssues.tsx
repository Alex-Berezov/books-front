import type { FC } from 'react';
import { formatDataIssue, type DataIssue } from '@/lib/admin/data-issue';
import styles from './WorldTab.module.scss';

/** Ошибка относится к полю `path` или к его вложенному пункту (`quotes.0.text` - к `quotes`). */
export const matchesIssuePath = (issue: DataIssue, path: string) =>
  issue.path === path || issue.path.startsWith(`${path}.`);

export const FieldIssues: FC<{ issues: DataIssue[] }> = ({ issues }) =>
  issues.length > 0 ? (
    <ul className={`${styles.issueList} ${styles.error}`}>
      {issues.map((issue, idx) => (
        <li key={idx}>{formatDataIssue(issue)}</li>
      ))}
    </ul>
  ) : null;
