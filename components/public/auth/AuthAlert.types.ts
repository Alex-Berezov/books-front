export interface AuthAlertProps {
  title: string;
  description: string;
  /** Доступное имя крестика закрытия. */
  closeLabel: string;
  onClose: () => void;
}
