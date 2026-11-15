import type { FC } from 'react';
import type { MessageLinesProps } from './MessageLines.types';
import styles from './MessageLines.module.scss';

/**
 * Многострочный текст отказа списком — по строке на ошибку (сервер отдаёт ошибки проверки
 * массивом «путь: причина», `lib/admin/request-errors.ts` склеивает их переводом строки).
 */
export const MessageLines: FC<MessageLinesProps> = ({ text }) => (
  <ul className={styles.list}>
    {text.split('\n').map((line, idx) => (
      <li key={idx}>{line}</li>
    ))}
  </ul>
);
