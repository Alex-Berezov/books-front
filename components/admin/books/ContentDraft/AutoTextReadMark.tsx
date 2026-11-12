'use client';

import { useEffect, useRef, type FC } from 'react';
import { useAutoTextRead } from '@/api/hooks';
import { Button } from '@/components/admin/common/Button';
import { formatDateTime } from '@/lib/admin/formatters';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { AutoTextRunKind } from '@/types/api-schema';
import styles from './ContentDraft.module.scss';
import { refusalCode, refusalText } from './contentDraft.utils';

/** Отказы отметки: свои подписи, прочие — общей подписью ходов. */
const MARK_REFUSALS: Record<string, string> = {
  AUTO_TEXT_RUN_BUILDING: 'The run is still writing: mark the text read when it ends.',
  AUTO_TEXT_NONE: 'No model text has been written here: there is nothing to mark.',
  AUTO_TEXT_CHANGED:
    'New model text was written after this tab was shown: read it, then mark again.',
};

const markRefusalText = (error: unknown): string => {
  const code = refusalCode(error);
  return (code && MARK_REFUSALS[code]) ?? refusalText(error);
};

/** Что в элементе хода меняется, когда текст модели ложится в поля. */
interface RunItemStamp {
  outcome: string;
  regenerating: boolean;
}

/**
 * Отпечаток хода, по которому отметка перечитывается: свой ход, его статус, записанные и принятые
 * элементы и идущие перегенерации. Опрос хода, не менявший ничего из этого, запросов не даёт.
 */
const runStamp = (run: { id: string; status: string; items: RunItemStamp[] } | null): string =>
  run
    ? [
        run.id,
        run.status,
        run.items.map((i) => `${i.outcome}${i.regenerating ? '*' : ''}`).join(','),
      ].join(':')
    : 'none';

export interface AutoTextReadMarkProps {
  versionId: string;
  lang: SupportedLang;
  kind: AutoTextRunKind;
  /**
   * Ход на экране; `undefined` — ещё грузится. Ход записал текст (исходы элементов, перегенерация,
   * статус) — отметка могла сняться сама; пока ход пишет, отметить нельзя.
   */
  run: { id: string; status: string; items: RunItemStamp[] } | null | undefined;
}

/**
 * Отметка редактора «прочитано» (T184): без неё версия с текстом модели в полях вкладки
 * не публикуется. Текст модели, легший после отметки, снимает её сам; ручная правка — нет.
 */
export const AutoTextReadMark: FC<AutoTextReadMarkProps> = ({ versionId, lang, kind, run }) => {
  const { query, mark, unmark, refreshAfterRun } = useAutoTextRead(versionId, kind);
  // Ход ещё грузится — отпечатка нет: первый показ читает отметку сам (`useQuery`), без второго GET.
  const stamp = run === undefined ? undefined : runStamp(run);
  const seen = useRef(stamp);
  // `reset` у мутации react-query стабилен между рендерами, сами объекты мутаций — нет.
  const { reset: resetMark } = mark;
  const { reset: resetUnmark } = unmark;
  useEffect(() => {
    if (stamp === undefined || seen.current === undefined) {
      seen.current = stamp;
      return;
    }
    if (stamp === seen.current) return;
    seen.current = stamp;
    // Отказ прошлого нажатия к новому состоянию хода не относится.
    resetMark();
    resetUnmark();
    void refreshAfterRun();
  }, [stamp, refreshAfterRun, resetMark, resetUnmark]);

  if (query.isError) {
    return (
      <p className={styles.error} role="alert">
        Failed to load the read mark: publication may be refused until the text is marked read.{' '}
        <Button variant="link" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </p>
    );
  }
  const state = query.data;
  if (!state?.autoTextAt) return null;
  const pending = mark.isPending || unmark.isPending;
  const writing = run?.status === 'building';
  const error = mark.error ?? unmark.error;

  return (
    <div className={styles.block} aria-label="Read mark">
      <div className={styles.actions}>
        {state.read ? (
          <>
            <span className={styles.hint}>
              Marked read {formatDateTime(state.readAt, lang)}: the version can be published.
            </span>
            <Button
              variant="ghost"
              onClick={() => {
                mark.reset();
                unmark.mutate();
              }}
              loading={unmark.isPending}
              disabled={pending}
            >
              Unmark
            </Button>
          </>
        ) : (
          <>
            <span className={styles.hint}>
              Model text written {formatDateTime(state.autoTextAt, lang)} is not marked read: the
              version is not published until it is.
              {writing ? ' The run is still writing: mark it read when the run ends.' : ''}
            </span>
            <Button
              onClick={() => {
                unmark.reset();
                if (state.autoTextAt) mark.mutate(state.autoTextAt);
              }}
              loading={mark.isPending}
              disabled={pending || writing}
            >
              Mark as read
            </Button>
          </>
        )}
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {markRefusalText(error)}
        </p>
      ) : null}
    </div>
  );
};
