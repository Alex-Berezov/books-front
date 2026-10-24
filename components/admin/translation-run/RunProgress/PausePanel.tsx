'use client';

import { useMemo, useState, type FC, type ReactNode } from 'react';
import { Alert, Button, Input, Popconfirm, Select } from 'antd';
import Link from 'next/link';
import { useLlmModels } from '@/api/hooks';
import {
  formatMoney,
  isValidMoney,
} from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { LlmOperation, ResumeTranslationRunRequest } from '@/types/api-schema';
import {
  operationStatusText,
  refusalText,
  stageName,
  stepFailureText,
  toModelOptions,
  type PauseAction,
} from '../translationRun.utils';
import styles from './RunProgress.module.scss';

export interface PausePanelProps {
  pause: PauseAction;
  lang: SupportedLang;
  pending: boolean;
  onResume: (data: ResumeTranslationRunRequest) => void;
  onResumeOperation: (id: string) => void;
  onRestart: () => void;
}

/** Новый лимит, $: поле и «продолжить» с ним — пауза запуска по лимиту и операция досье. */
export const LimitResume: FC<{
  label: string;
  pending: boolean;
  onResume: (limitUsd: string) => void;
  children?: ReactNode;
}> = ({ label, pending, onResume, children }) => {
  const [limit, setLimit] = useState('');
  const ok = isValidMoney(limit);
  return (
    <div className={styles.pause}>
      {children}
      <Input
        aria-label={label}
        className={styles.limit}
        value={limit}
        onChange={(e) => setLimit(e.target.value)}
        status={limit === '' || ok ? undefined : 'error'}
      />
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

/** Пауза без провайдера: модель этапа на этот запуск (решение арбитра `F05 | F05-7`). */
const ProviderPause: FC<{
  pause: Extract<PauseAction, { kind: 'provider' }>;
  settings: ReactNode;
  pending: boolean;
  onResume: PausePanelProps['onResume'];
}> = ({ pause, settings, pending, onResume }) => {
  // Каталог нужен только здесь: страница версии без такой паузы его не грузит.
  const models = useLlmModels();
  const options = useMemo(() => toModelOptions(models.data?.items ?? []), [models.data]);
  const [model, setModel] = useState<string | null>(null);
  return (
    <div className={styles.pause}>
      <span>
        No provider without data retention for the {stageName(pause.stage).toLowerCase()} stage:{' '}
        {pause.models.join(', ') || 'the stage model'}. Pick another model for this run (or see{' '}
        {settings}):
      </span>
      <Select
        aria-label="Model for the stage"
        className={styles.model}
        showSearch
        optionFilterProp="label"
        loading={models.isLoading}
        options={options}
        value={model ?? undefined}
        onChange={(value: string) => setModel(value)}
      />
      <Button
        type="primary"
        loading={pending}
        disabled={model === null}
        onClick={() => model && onResume({ stageModels: { [pause.stage]: model } })}
      >
        Resume
      </Button>
      {models.isError && <Alert type="error" message={refusalText(models.error)} />}
    </div>
  );
};

/** Причина паузы и её действие (карточка F05-7, шаг 3; решения арбитра `F05 | F05-7`). */
export const PausePanel: FC<PausePanelProps> = ({
  pause,
  lang,
  pending,
  onResume,
  onResumeOperation,
  onRestart,
}) => {
  const settings = <Link href={`/admin/${lang}/llm-settings`}>LLM settings</Link>;
  const resume = (
    <Button type="primary" loading={pending} onClick={() => onResume({})}>
      Resume
    </Button>
  );

  switch (pause.kind) {
    case 'manual':
      return <div className={styles.pause}>Paused with the Pause button. {resume}</div>;
    case 'limit':
      return (
        <LimitResume
          label="New run limit"
          pending={pending}
          onResume={(limitUsd) => onResume({ limitUsd })}
        >
          <span>The run limit is reached. New limit, $:</span>
        </LimitResume>
      );
    case 'contextLimit':
      return (
        <LimitResume
          label="New run limit"
          pending={pending}
          onResume={(limitUsd) => onResume({ limitUsd })}
        >
          <span>
            The run limit left is lower than the dossier or glossary needs: nothing was spent on
            them. Resume with a run limit of at least{' '}
            {pause.neededUsd ? formatMoney(pause.neededUsd) : 'their estimate'}. New limit, $:
          </span>
        </LimitResume>
      );
    case 'ceiling':
      return (
        <div className={styles.pause}>
          The common spending ceiling is reached: raise it in {settings}, then {resume}
        </div>
      );
    case 'provider':
      return (
        <ProviderPause pause={pause} settings={settings} pending={pending} onResume={onResume} />
      );
    case 'dossier':
      return (
        <div className={styles.pause}>
          Waiting for the dossier or glossary
          {pause.operation ? `: ${operationStatusText(pause.operation)}` : ''}.{' '}
          {pause.operation?.status === 'paused' &&
            pause.operation.pauseReason !== 'LIMIT_REACHED' && (
              <Button
                type="primary"
                loading={pending}
                onClick={() => onResumeOperation((pause.operation as LlmOperation).id)}
              >
                Resume the dossier or glossary
              </Button>
            )}
        </div>
      );
    case 'stale':
    case 'contextFailed':
      return (
        <div className={styles.pause}>
          {pause.kind === 'stale'
            ? 'The source changed after the dossier was built: this run cannot go on.'
            : 'The dossier or glossary build this run waited for was cancelled or failed: this run cannot go on.'}{' '}
          {pause.kind === 'contextFailed' && (
            <>
              If the dossier does not fit the model context, change the dossier model in {settings}{' '}
              first.{' '}
            </>
          )}
          <Popconfirm
            title="Cancel this run and start a new one?"
            description="The new run rebuilds the dossier; you will see a new estimate."
            okText="Rebuild and start again"
            cancelText="Keep"
            onConfirm={onRestart}
          >
            <Button type="primary">Rebuild and start again</Button>
          </Popconfirm>
        </div>
      );
    case 'funds':
      return (
        <div className={styles.pause}>
          The OpenRouter balance is empty: top it up, then {resume}
        </div>
      );
    case 'step':
      return (
        <div className={styles.pause}>
          A step failed: {stepFailureText(pause.reason)}. {resume}
        </div>
      );
    case 'unknown':
      return (
        <div className={styles.pause}>
          Paused: {pause.reason}. {resume}
        </div>
      );
  }
};
