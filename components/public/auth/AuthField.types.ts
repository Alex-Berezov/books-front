import type { ReactNode } from 'react';

/** Подписи кнопки показа пароля. */
export interface AuthFieldToggleLabels {
  show: string;
  hide: string;
}

export interface AuthFieldProps {
  /** `id` поля: `<имя формы>_<имя поля>`, как его собирал `Form.Item` antd. */
  id: string;
  /** Имя поля в форме. */
  name: string;
  label: string;
  icon: ReactNode;
  type: 'text' | 'password';
  value: string;
  /** Текст ошибки; пока его нет, поле считается верным. */
  error?: string;
  placeholder: string;
  autoComplete: string;
  onChange: (value: string) => void;
  /** Подписи кнопки показа пароля — только для `type="password"`. */
  toggleLabels?: AuthFieldToggleLabels;
}
