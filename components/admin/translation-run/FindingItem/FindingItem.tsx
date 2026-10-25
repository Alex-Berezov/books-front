import type { FC } from 'react';
import type { TranslationReportFinding } from '@/types/api-schema';
import { findingText } from '../translationRun.utils';
import styles from './FindingItem.module.scss';

/**
 * Находка главы — одна строка и в отчёте запуска, и на экране кусков (F05-7, F05-7v): код
 * словами, стык, суть, форма глоссария; находка к тексту до повтора или правки (`stale`)
 * приглушена (решение арбитра `F05 | F05-7v`).
 */
export const FindingItem: FC<{ finding: TranslationReportFinding }> = ({ finding: f }) => (
  <li className={f.stale ? styles.stale : undefined}>
    {findingText(f.code)}
    {f.seam !== undefined && ` (seam ${f.seam})`}
    {f.issue && `: ${f.issue}`}
    {f.form && ` — ${f.form}${f.target ? ` → ${f.target}` : ''}`}
    {f.stale && ' — before a retry or edit'}
  </li>
);
