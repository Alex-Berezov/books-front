'use client';

import type { FC } from 'react';
import Link from 'next/link';
import { Button } from '@/components/admin/common/Button';
import { LimitResume } from '@/components/admin/common/LimitResume';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { LlmOperation } from '@/types/api-schema';
import styles from './ContentDraft.module.scss';

/** «Продолжить» операции: тот же вызов у заготовки Analysis и хода пересказа. */
export interface ResumeAction {
  mutate: (vars: { id: string; limitUsd?: string }) => void;
  isPending: boolean;
  error: unknown;
}

export interface OperationProgressProps {
  /** Нужны только id, статус и причина паузы: так её рисует и перегенерация текста хода (F06-5c). */
  operation: Pick<LlmOperation, 'id' | 'status' | 'pauseReason'>;
  /** Строка хода: чего ждёт, сколько готово или пауза с причиной. */
  text: string;
  lang: SupportedLang;
  resume: ResumeAction;
  /** Подпись поля нового лимита (пауза `LIMIT_REACHED`). */
  limitLabel: string;
  /** Кнопка «продолжить» — и с новым лимитом, и на прочих паузах. */
  resumeLabel: string;
  refusalText: (error: unknown) => string;
}

/**
 * Ход фоном под операцией LLM (заготовка Analysis F05-11, ход «Write Summary» F06-3): строка хода,
 * пауза с причиной и «продолжить» (для `LIMIT_REACHED` - с новым лимитом), ссылка на «LLM settings»
 * при потолке и провайдерах, отказ «продолжить».
 */
export const OperationProgress: FC<OperationProgressProps> = ({
  operation,
  text,
  lang,
  resume,
  limitLabel,
  resumeLabel,
  refusalText,
}) => {
  const paused = operation.status === 'paused';
  const reason = operation.pauseReason;
  return (
    <div className={styles.draftStatus} role="status">
      <span>{text}</span>
      {paused && (reason === 'CEILING_REACHED' || reason === 'NO_COMPLIANT_PROVIDER') && (
        <Link href={`/admin/${lang}/llm-settings`}>LLM settings</Link>
      )}
      {paused &&
        (reason === 'LIMIT_REACHED' ? (
          <LimitResume
            label={limitLabel}
            pending={resume.isPending}
            actionLabel={resumeLabel}
            onResume={(limitUsd) => resume.mutate({ id: operation.id, limitUsd })}
          >
            <span>New limit, $:</span>
          </LimitResume>
        ) : (
          <Button
            variant="secondary"
            onClick={() => resume.mutate({ id: operation.id })}
            loading={resume.isPending}
            disabled={resume.isPending}
          >
            {resumeLabel}
          </Button>
        ))}
      {resume.error ? (
        <span className={styles.error} role="alert">
          {refusalText(resume.error)}
        </span>
      ) : null}
    </div>
  );
};
