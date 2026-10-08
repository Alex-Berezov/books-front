import type { FormEvent } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAuthForm, type AuthFormValues } from '@/components/public/auth';

type Field = 'password' | 'confirm';

const validate = (field: Field, values: AuthFormValues<Field>): string | undefined => {
  if (field === 'password') return values.password ? undefined : 'required';
  return values.confirm === values.password ? undefined : 'mismatch';
};

const submitEvent = () => ({ preventDefault: vi.fn() }) as unknown as FormEvent<HTMLFormElement>;

const setup = (busy = false, onValid = vi.fn()) =>
  renderHook(
    (props: { busy: boolean }) =>
      useAuthForm<Field>({
        initial: { password: '', confirm: '' },
        fields: ['password', 'confirm'],
        validate,
        dependents: { password: ['confirm'] },
        busy: props.busy,
        onValid,
      }),
    { initialProps: { busy } }
  );

describe('useAuthForm', () => {
  it('проверяет поле на вводе', () => {
    const { result } = setup();
    act(() => result.current.handleChange('password')(''));
    expect(result.current.errors.password).toBe('required');

    act(() => result.current.handleChange('password')('secret'));
    expect(result.current.errors.password).toBeUndefined();
  });

  it('не перепроверяет зависимое поле, пока его не трогали', () => {
    const { result } = setup();
    act(() => result.current.handleChange('password')('secret'));
    expect(result.current.errors.confirm).toBeUndefined();
  });

  it('перепроверяет тронутое зависимое поле при смене ведущего', () => {
    const { result } = setup();
    act(() => result.current.handleChange('password')('secret'));
    act(() => result.current.handleChange('confirm')('secret'));
    expect(result.current.errors.confirm).toBeUndefined();

    act(() => result.current.handleChange('password')('secret1'));
    expect(result.current.errors.confirm).toBe('mismatch');
  });

  it('после отправки зависимое поле перепроверяется и без ввода в него', () => {
    const onValid = vi.fn();
    const { result } = setup(false, onValid);
    act(() => result.current.handleSubmit(submitEvent()));
    expect(result.current.errors).toEqual({ password: 'required', confirm: undefined });
    expect(onValid).not.toHaveBeenCalled();

    act(() => result.current.handleChange('password')('secret'));
    expect(result.current.errors.confirm).toBe('mismatch');
  });

  it('два ввода подряд до перерисовки (автозаполнение браузера) не затирают друг друга', () => {
    const onValid = vi.fn();
    const { result } = setup(false, onValid);
    const { handleChange, handleSubmit } = result.current;

    act(() => {
      handleChange('password')('secret');
      handleChange('confirm')('secret');
    });
    expect(result.current.values).toEqual({ password: 'secret', confirm: 'secret' });

    act(() => handleSubmit(submitEvent()));
    expect(onValid).toHaveBeenCalledWith({ password: 'secret', confirm: 'secret' });
  });

  it('отправка без ошибок отдаёт значения в onValid', () => {
    const onValid = vi.fn();
    const { result } = setup(false, onValid);
    act(() => result.current.handleChange('password')('secret'));
    act(() => result.current.handleChange('confirm')('secret'));
    const event = submitEvent();
    act(() => result.current.handleSubmit(event));

    expect(event.preventDefault).toHaveBeenCalled();
    expect(onValid).toHaveBeenCalledTimes(1);
    expect(onValid).toHaveBeenCalledWith({ password: 'secret', confirm: 'secret' });
  });

  it('пока busy, отправка гасится целиком', () => {
    const onValid = vi.fn();
    const { result, rerender } = setup(false, onValid);
    act(() => result.current.handleChange('password')('secret'));
    act(() => result.current.handleChange('confirm')('secret'));

    rerender({ busy: true });
    const event = submitEvent();
    act(() => result.current.handleSubmit(event));
    expect(event.preventDefault).toHaveBeenCalled();
    expect(onValid).not.toHaveBeenCalled();

    rerender({ busy: false });
    act(() => result.current.handleSubmit(submitEvent()));
    expect(onValid).toHaveBeenCalledTimes(1);
  });
});
