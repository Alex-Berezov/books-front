'use client';

import type { FC, MouseEvent } from 'react';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { AuthFieldProps } from './AuthField.types';
import styles from './AuthField.module.scss';

/**
 * Поле формы входа и регистрации: подпись с отметкой обязательности, иконка
 * слева, у пароля — кнопка показа справа, текст ошибки под полем.
 *
 * Повторяет `Form.Item` + `Input` / `Input.Password` antd размера `large`
 * (`LEGACY-442`): ошибка связана с полем через `aria-describedby` по тому же
 * `id` `<поле>_help`.
 */
export const AuthField: FC<AuthFieldProps> = ({
  id,
  name,
  label,
  icon,
  type,
  value,
  error,
  placeholder,
  autoComplete,
  onChange,
  toggleLabels,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const helpId = `${id}_help`;
  const hasError = Boolean(error);
  const isPassword = type === 'password';

  // Как у antd: нажатие на кнопку показа не уводит фокус из поля.
  const keepFocus = (event: MouseEvent<HTMLButtonElement>) => event.preventDefault();

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={`${styles.inputWrapper} ${hasError ? styles.inputWrapperError : ''}`}>
        <span className={styles.inputPrefix}>{icon}</span>
        <input
          id={id}
          name={name}
          type={isPassword && !isVisible ? 'password' : 'text'}
          className={styles.input}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-required="true"
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={hasError ? helpId : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        {isPassword && toggleLabels && (
          <button
            type="button"
            className={styles.inputSuffix}
            aria-label={isVisible ? toggleLabels.hide : toggleLabels.show}
            aria-pressed={isVisible}
            aria-controls={id}
            onMouseDown={keepFocus}
            onClick={() => setIsVisible((visible) => !visible)}
          >
            {isVisible ? <Eye size="1em" /> : <EyeOff size="1em" />}
          </button>
        )}
      </div>
      {hasError && (
        <div id={helpId} role="alert" className={styles.fieldError}>
          {error}
        </div>
      )}
    </div>
  );
};
