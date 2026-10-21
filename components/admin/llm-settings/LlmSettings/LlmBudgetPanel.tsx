'use client';

import { useState, type FC } from 'react';
import { Alert, Button, Input } from 'antd';
import { useSnackbar } from 'notistack';
import { useUpdateLlmBudget } from '@/api/hooks';
import { ApiError } from '@/types/api';
import type { LlmStatus } from '@/types/api-schema';
import styles from './LlmSettings.module.scss';
import { formatMoney, isValidMoney, normalizeMoney } from './llmSettings.utils';

export interface LlmBudgetPanelProps {
  status: LlmStatus;
}

/**
 * Состояние модуля и бюджет. Ключ — только «есть/нет», значение не приходит и не выводится.
 * Без ключа потолок и лимит по-прежнему правятся: потолок 0 — стоп-кран (Р25).
 *
 * Поля живут до смены сохранённых сумм: родитель даёт ключ по ним, поэтому ответ сервера
 * подменяет ввод только тогда, когда суммы на сервере и правда поменялись.
 */
export const LlmBudgetPanel: FC<LlmBudgetPanelProps> = ({ status }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [ceiling, setCeiling] = useState(status.ceilingUsd ?? '');
  const [runLimit, setRunLimit] = useState(status.defaultRunLimitUsd ?? '');

  const updateBudget = useUpdateLlmBudget({
    onSuccess: () => enqueueSnackbar('Budget saved', { variant: 'success' }),
    onError: (error) => {
      // 5xx показывает глобальный тост `MutationCache`; свой дал бы второй.
      if (error instanceof ApiError && error.statusCode >= 500) return;
      enqueueSnackbar(error.message || 'Could not save the budget', { variant: 'error' });
    },
  });

  // Пустое поле — ошибка ввода, а не «не менять»: иначе стёртый потолок молча оставался прежним
  // при тосте «Budget saved». Одна сумма в другой записи (`100` и `100.00000000`) — без изменений.
  const ceilingInvalid = !isValidMoney(ceiling);
  const runLimitInvalid = !isValidMoney(runLimit);
  const unchanged =
    normalizeMoney(ceiling) === normalizeMoney(status.ceilingUsd ?? '') &&
    normalizeMoney(runLimit) === normalizeMoney(status.defaultRunLimitUsd ?? '');

  // Уходит только изменённое: PUT бюджета частичный, и вторая сумма из открытого экрана
  // затёрла бы правку другого админа, сделанную после загрузки.
  const save = () => {
    updateBudget.mutate({
      ...(normalizeMoney(ceiling) !== normalizeMoney(status.ceilingUsd ?? '')
        ? { ceilingUsd: ceiling.trim() }
        : {}),
      ...(normalizeMoney(runLimit) !== normalizeMoney(status.defaultRunLimitUsd ?? '')
        ? { defaultRunLimitUsd: runLimit.trim() }
        : {}),
    });
  };

  return (
    <section className={styles.section} aria-labelledby="llm-status-title">
      <h2 id="llm-status-title" className={styles.sectionTitle}>
        Status and budget
      </h2>

      {status.state === 'DISABLED' && (
        <Alert
          type="warning"
          showIcon
          className={styles.alert}
          message="OpenRouter key is not configured"
          description="No model can be called until the server has OPENROUTER_API_KEY. Settings below can still be read and changed."
        />
      )}

      {!status.budgetConfigured && (
        <Alert
          type="error"
          showIcon
          className={styles.alert}
          message="Spending ceiling row is missing"
          description="Every model call is refused until the ceiling exists; it is created by the database migration."
        />
      )}

      <dl className={styles.facts}>
        <dt>API key</dt>
        <dd>{status.keyConfigured ? 'Configured' : 'Not configured'}</dd>
        <dt>Ceiling</dt>
        <dd>{formatMoney(status.ceilingUsd)}</dd>
        <dt>Spent</dt>
        <dd>{formatMoney(status.spentUsd)}</dd>
        <dt>Reserved</dt>
        <dd>{formatMoney(status.reservedUsd)}</dd>
        <dt>Default run limit</dt>
        <dd>{formatMoney(status.defaultRunLimitUsd)}</dd>
      </dl>

      {status.budgetConfigured && (
        <div className={styles.budgetForm}>
          <div className={styles.field}>
            <label htmlFor="llm-budget-ceiling" className={styles.fieldLabel}>
              Ceiling, USD (0 stops every call)
            </label>
            <Input
              id="llm-budget-ceiling"
              value={ceiling}
              onChange={(event) => setCeiling(event.target.value)}
              status={ceilingInvalid ? 'error' : undefined}
              inputMode="decimal"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="llm-budget-run-limit" className={styles.fieldLabel}>
              Default run limit, USD (may exceed the ceiling)
            </label>
            <Input
              id="llm-budget-run-limit"
              value={runLimit}
              onChange={(event) => setRunLimit(event.target.value)}
              status={runLimitInvalid ? 'error' : undefined}
              inputMode="decimal"
            />
          </div>
          {(ceilingInvalid || runLimitInvalid) && (
            <p className={styles.error}>
              An amount is required: a non-negative number with up to 6 digits and up to 8 decimals.
            </p>
          )}
          <Button
            type="primary"
            onClick={save}
            loading={updateBudget.isPending}
            disabled={ceilingInvalid || runLimitInvalid || unchanged}
          >
            Save budget
          </Button>
        </div>
      )}
    </section>
  );
};
