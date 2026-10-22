'use client';

import { useEffect, useMemo, useRef, useState, type FC } from 'react';
import { Alert, Button, Input, Select, Spin } from 'antd';
import Link from 'next/link';
import {
  COMPARE_MAX_MODELS,
  COMPARE_MIN_MODELS,
  useChapterTitles,
  useLlmModels,
  useLlmStatus,
  useStartTranslationCompare,
  useTranslationCompare,
  useTranslationCompareEstimate,
  useTranslationCompares,
} from '@/api/hooks';
import {
  formatMoney,
  modelOptionLabel,
} from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import type { TranslationCompareParams } from '@/types/api-schema';
import { CompareEstimate } from './CompareEstimate';
import { CompareResult } from './CompareResult';
import styles from './TranslationCompare.module.scss';
import {
  canStartCompare,
  isLimitOk,
  operationText,
  refusalText,
  startRequest,
} from './translationCompare.utils';

export interface TranslationCompareProps {
  lang: SupportedLang;
  versionId: string;
}

/**
 * Сравнение 2–4 моделей перевода на одной главе (F05-3, `product.md` §2.5) — только `admin`.
 * Оценка до запуска, запуск, колонки «оригинал + модели» со стоимостью; пока операция идёт,
 * колонки перечитываются сами. Версия не создаётся, глоссарий не меняется.
 */
export const TranslationCompare: FC<TranslationCompareProps> = ({ lang, versionId }) => {
  // Только номера и названия: выпадающему списку текст глав не нужен.
  const chapters = useChapterTitles(versionId);
  const models = useLlmModels();
  const status = useLlmStatus();
  const list = useTranslationCompares(versionId);

  const [chapterNumber, setChapterNumber] = useState<number | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [limit, setLimit] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const params: TranslationCompareParams | null =
    chapterNumber !== null && targetLanguage !== null
      ? { chapterNumber, targetLanguage, models: selected }
      : null;
  const estimate = useTranslationCompareEstimate(versionId, params);
  const start = useStartTranslationCompare(versionId, {
    onSuccess: (compare) => setOpenId(compare.id),
  });
  const open = useTranslationCompare(openId);
  useResetOnChange(start, [chapterNumber, targetLanguage, selected]);

  const chapterOptions = useMemo(
    () =>
      (chapters.data?.items ?? []).map((c) => ({
        value: c.number,
        label: c.title ? `${c.number}. ${c.title}` : `Chapter ${c.number}`,
      })),
    [chapters.data]
  );
  const modelOptions = useMemo(
    () => (models.data?.items ?? []).map((m) => ({ value: m.id, label: modelOptionLabel(m) })),
    [models.data]
  );

  const keyMissing = status.data?.state === 'DISABLED';
  const limitOk = isLimitOk(limit);
  const canStart = canStartCompare({
    keyMissing,
    params,
    limit,
    estimateReady: estimate.isSuccess,
    pending: start.isPending,
  });

  const run = () => {
    if (!canStart || params === null) return;
    start.mutate(startRequest(params, limit));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Translation compare</h1>
        <Link href={`/admin/${lang}/books/versions/${versionId}`}>Back to the version</Link>
      </div>
      <p className={styles.note}>
        Translates one chapter with 2–4 models side by side. No version is created and the glossary
        is not changed; texts are not checked for language or names here.
      </p>

      {keyMissing && (
        <Alert
          className={styles.alert}
          type="warning"
          showIcon
          message="The OpenRouter key is not configured on the server: a compare cannot start."
        />
      )}

      <section className={styles.section} aria-label="New compare">
        <div className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="compare-chapter">Chapter</label>
            <Select
              id="compare-chapter"
              placeholder={chapters.isLoading ? 'Loading…' : 'Choose a chapter'}
              options={chapterOptions}
              value={chapterNumber ?? undefined}
              onChange={(value: number) => setChapterNumber(value)}
              notFoundContent="The version has no chapters"
            />
            {chapters.isError && <Alert type="error" message={refusalText(chapters.error)} />}
          </div>
          <div className={styles.field}>
            <label htmlFor="compare-language">Target language</label>
            <Select
              id="compare-language"
              placeholder="Choose a language"
              options={SUPPORTED_LANGS.map((l) => ({ value: l, label: l.toUpperCase() }))}
              value={targetLanguage ?? undefined}
              onChange={(value: string) => setTargetLanguage(value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="compare-models">
              Models ({COMPARE_MIN_MODELS}–{COMPARE_MAX_MODELS})
            </label>
            <Select
              id="compare-models"
              mode="multiple"
              maxCount={COMPARE_MAX_MODELS}
              showSearch
              optionFilterProp="label"
              placeholder={models.isLoading ? 'Loading…' : 'Choose models'}
              options={modelOptions}
              value={selected}
              onChange={(value: string[]) => setSelected(value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="compare-limit">Limit, $ (optional)</label>
            <Input
              id="compare-limit"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder={estimate.data ? formatMoney(estimate.data.suggestedLimitUsd) : ''}
              status={limitOk ? undefined : 'error'}
            />
            {!limitOk && (
              <span className={styles.fieldError}>An amount in dollars, up to 8 decimals: 1.5</span>
            )}
          </div>
        </div>
        {models.isError && (
          <Alert className={styles.alert} type="error" message={refusalText(models.error)} />
        )}

        {estimate.isFetching && <Spin />}
        {estimate.isError && (
          <Alert className={styles.alert} type="error" message={refusalText(estimate.error)} />
        )}
        {estimate.data && <CompareEstimate estimate={estimate.data} />}
        {start.isError && (
          <Alert className={styles.alert} type="error" message={refusalText(start.error)} />
        )}
        <Button type="primary" disabled={!canStart} loading={start.isPending} onClick={run}>
          Start compare
        </Button>
      </section>

      {open.isLoading && <Spin />}
      {open.isError && (
        <Alert
          className={styles.alert}
          type="error"
          message={refusalText(open.error)}
          // Опрос после отказа встаёт (тосты на каждый цикл); вернуть ход - этой кнопкой.
          action={
            <Button size="small" onClick={() => void open.refetch()}>
              Retry
            </Button>
          }
        />
      )}
      {/* Своё состояние у каждого сравнения: лимит и отказ прошлого не переезжают на новое. */}
      {open.data && <CompareResult key={open.data.id} compare={open.data} />}

      <section className={styles.section} aria-label="Past compares">
        <h2 className={styles.sectionTitle}>Past compares</h2>
        {list.isLoading && <Spin />}
        {list.isError && (
          <Alert className={styles.alert} type="error" message={refusalText(list.error)} />
        )}
        {list.data && list.data.items.length === 0 && <p>No compares yet.</p>}
        <ul className={styles.list}>
          {(list.data?.items ?? []).map((item) => (
            <li key={item.id}>
              <Button type="link" onClick={() => setOpenId(item.id)}>
                Chapter {item.chapterNumber} → {item.language.toUpperCase()}:{' '}
                {item.models.join(', ')}
              </Button>{' '}
              <span className={styles.muted}>
                {operationText(item.operation, false)} · spent{' '}
                {formatMoney(item.operation.spentUsd)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

/**
 * Отказ прошлого запуска относился к прежним параметрам: при их смене он снимается. Пока запуск
 * идёт, мутация не сбрасывается: сброс снял бы `isPending`, кнопка открылась бы снова, и второй
 * клик оплатил бы второе сравнение той же главы (F05-3, круг 3).
 */
export const useResetOnChange = (
  start: { reset: () => void; isPending: boolean },
  deps: readonly unknown[]
) => {
  const pending = useRef(start.isPending);
  pending.current = start.isPending;
  const { reset } = start;
  useEffect(() => {
    if (!pending.current) reset();
    // Сброс - только на смену параметров формы, а не на смену состояния самой мутации.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps - параметры формы вызывающего
  }, [reset, ...deps]);
};
