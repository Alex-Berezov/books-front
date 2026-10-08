'use client';

import { useRef, useState, type FormEvent } from 'react';
import type {
  AuthFormErrors,
  AuthFormValues,
  UseAuthFormOptions,
  UseAuthFormResult,
} from './useAuthForm.types';

/**
 * Состояние и проверка форм входа и регистрации вместо `Form` antd (`LEGACY-442`).
 *
 * Поведение повторяет прежнее: поле проверяется на каждом вводе
 * (`validateTrigger: 'onChange'`), и ошибка появляется или уходит сразу;
 * отправка проверяет все поля и пропускает запрос только без ошибок (`onFinish`).
 * Пока идёт запрос (`busy`), отправка гасится здесь же: кнопка в загрузке глотает
 * только собственный клик, а отправка формы мимо неё доходит до `onSubmit`.
 */
export const useAuthForm = <F extends string>({
  initial,
  fields,
  validate,
  dependents,
  busy,
  onValid,
}: UseAuthFormOptions<F>): UseAuthFormResult<F> => {
  const [values, setValues] = useState<AuthFormValues<F>>(initial);
  const [errors, setErrors] = useState<AuthFormErrors<F>>({});
  // Поля, которые уже вводили или проверяли отправкой: только их antd
  // перепроверял по зависимости.
  // Значения и «тронутость» читаются из ref, а не из замыкания рендера:
  // автозаполнение браузера шлёт почту и пароль подряд, до перерисовки, и второй
  // ввод, собранный из старого `values`, затирал бы первый.
  const valuesRef = useRef(values);
  const touchedRef = useRef<Partial<Record<F, boolean>>>({});

  const handleChange = (field: F) => (value: string) => {
    const next = { ...valuesRef.current, [field]: value };
    const touched = { ...touchedRef.current, [field]: true };
    valuesRef.current = next;
    touchedRef.current = touched;
    setValues(next);
    setErrors((prev) => {
      const updated: AuthFormErrors<F> = { ...prev, [field]: validate(field, next) };
      for (const dependent of dependents?.[field] ?? []) {
        if (touched[dependent]) updated[dependent] = validate(dependent, next);
      }
      return updated;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const current = valuesRef.current;
    const nextErrors: AuthFormErrors<F> = {};
    const nextTouched: Partial<Record<F, boolean>> = {};
    for (const field of fields) {
      nextErrors[field] = validate(field, current);
      nextTouched[field] = true;
    }
    touchedRef.current = nextTouched;
    setErrors(nextErrors);
    if (fields.some((field) => nextErrors[field])) return;
    onValid(current);
  };

  return { values, errors, handleChange, handleSubmit };
};
