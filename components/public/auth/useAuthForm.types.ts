import type { FormEvent } from 'react';

/** Значения полей формы по имени поля. */
export type AuthFormValues<F extends string> = Record<F, string>;

/** Тексты ошибок полей; поля без ошибки здесь нет или в нём `undefined`. */
export type AuthFormErrors<F extends string> = Partial<Record<F, string>>;

export interface UseAuthFormOptions<F extends string> {
  initial: AuthFormValues<F>;
  /** Порядок полей: в нём они проверяются при отправке. */
  fields: readonly F[];
  /** Текст ошибки поля или `undefined`, если поле в порядке. */
  validate: (field: F, values: AuthFormValues<F>) => string | undefined;
  /**
   * Поля, которые перепроверяются при смене другого поля, — как `dependencies`
   * у `Form.Item` antd: подтверждение пароля при смене пароля. Перепроверяется
   * только поле, которое уже вводили или проверяли отправкой.
   */
  dependents?: Partial<Record<F, readonly F[]>>;
  /** Идёт запрос: повторная отправка гасится целиком, без проверки полей. */
  busy: boolean;
  /** Отправка прошла проверку всех полей. */
  onValid: (values: AuthFormValues<F>) => void;
}

export interface UseAuthFormResult<F extends string> {
  values: AuthFormValues<F>;
  errors: AuthFormErrors<F>;
  /** Обработчик ввода поля: `onChange={handleChange('email')}`. */
  handleChange: (field: F) => (value: string) => void;
  /** Обработчик `onSubmit` формы. */
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
