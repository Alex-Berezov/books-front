'use client';

import { useState, type FC, type ReactNode } from 'react';
import { Button, Input } from 'antd';
import { isValidMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import styles from './LimitResume.module.scss';

export interface LimitResumeProps {
  label: string;
  pending: boolean;
  onResume: (limitUsd: string) => void;
  children?: ReactNode;
}

export interface LimitInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Формат суммы прошёл (своя проверка формы — например, лимит больше нуля). */
  ok: boolean;
  id?: string;
  'aria-label'?: string;
}

/** Поле суммы лимита, $: одна ширина и одна красная рамка на неверном вводе во всех формах. */
export const LimitInput: FC<LimitInputProps> = ({ value, onChange, ok, ...rest }) => (
  <Input
    {...rest}
    className={styles.limit}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    status={value === '' || ok ? undefined : 'error'}
  />
);

/**
 * Новый лимит, $: поле и «продолжить» с ним — пауза запуска по лимиту, операция досье
 * и попытка повтора куска (F05-7, F05-7v).
 */
export const LimitResume: FC<LimitResumeProps> = ({ label, pending, onResume, children }) => {
  const [limit, setLimit] = useState('');
  const ok = isValidMoney(limit);
  return (
    <div className={styles.row}>
      {children}
      <LimitInput aria-label={label} value={limit} onChange={setLimit} ok={ok} />
      <Button
        type="primary"
        loading={pending}
        disabled={!ok}
        onClick={() => onResume(limit.trim())}
      >
        Resume
      </Button>
    </div>
  );
};
