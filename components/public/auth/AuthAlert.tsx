import type { FC } from 'react';
import { CircleX, X } from 'lucide-react';
import type { AuthAlertProps } from './AuthAlert.types';
import styles from './AuthAlert.module.scss';

/**
 * Плашка отказа форм входа и регистрации: то же, что `Alert type="error"
 * showIcon closable` antd (`LEGACY-442`) — иконка, заголовок, текст и крестик.
 */
export const AuthAlert: FC<AuthAlertProps> = ({ title, description, closeLabel, onClose }) => (
  <div role="alert" className={styles.alert}>
    <CircleX className={styles.alertIcon} size="1em" />
    <div className={styles.alertContent}>
      <div className={styles.alertMessage}>{title}</div>
      <div className={styles.alertDescription}>{description}</div>
    </div>
    <button type="button" className={styles.alertClose} aria-label={closeLabel} onClick={onClose}>
      <X size="1em" />
    </button>
  </div>
);
