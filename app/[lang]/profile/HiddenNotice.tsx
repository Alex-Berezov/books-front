import type { FC } from 'react';
import { EyeOff } from 'lucide-react';
import styles from './profile.module.scss';

/** Метка скрытия модератором — одна на корень и на ответ (`LEGACY-212`, `LEGACY-366`). */
export const HiddenNotice: FC<{ text: string }> = ({ text }) => (
  <div className={styles.hiddenNotice}>
    <EyeOff size={12} />
    <span>{text}</span>
  </div>
);
