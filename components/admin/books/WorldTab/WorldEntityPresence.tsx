import type { FC } from 'react';
import { Button } from '@/components/admin/common/Button';
import type { WorldRecountNotice } from './useWorldRecountNotice';
import type { BookWorldMentions } from '@/types/api-schema';
import styles from './WorldTab.module.scss';

const chaptersLabel = (n: number) => `${n} ${n === 1 ? 'chapter' : 'chapters'}`;

interface WorldEntityPresenceProps {
  /** Посчитанное присутствие (F08-2); `null` — ещё не посчитано. */
  mentions: BookWorldMentions | null;
  isNew: boolean;
  /** У версии есть главы; `null` — неизвестно (новая сущность). */
  versionHasChapters: boolean | null;
  /** У версии стоит пересчёт: `saved` — его поставила запись этой карточки (решения арбитра S5, S6). */
  recountNotice: WorldRecountNotice;
  /** Перечитать карточку и строку списка. */
  onReload: () => void;
  /** Отказ последнего Reload: без него отказ неотличим от «пересчёт ещё идёт». */
  reloadError: string | null;
}

/** Метка до пересчёта и Reload: опроса нет, присутствие считает бэкенд очередью. */
const ReloadPresence: FC<{ label: string; onReload: () => void; error: string | null }> = ({
  label,
  onReload,
  error,
}) => (
  <span className={styles.hint}>
    {label}{' '}
    <Button type="button" variant="link" size="sm" onClick={onReload}>
      Reload presence
    </Button>
    {error && (
      <span className={styles.error} role="alert">
        {' '}
        Could not reload: {error}
      </span>
    )}
  </span>
);

/**
 * Присутствие — только чтение: считает бэкенд по тексту глав (`product.md` §9), пересчётом
 * очереди после записи сущности и правки глав (решение арбитра `F08 | F08-2` R2).
 */
export const WorldEntityPresence: FC<WorldEntityPresenceProps> = ({
  mentions,
  isNew,
  versionHasChapters,
  recountNotice,
  onReload,
  reloadError,
}) => {
  if (versionHasChapters === false) {
    return <span>The version has no chapters yet — presence is counted from chapter text</span>;
  }
  if (recountNotice !== null) {
    return (
      <ReloadPresence
        label={
          recountNotice === 'saved'
            ? 'Saved — presence will update after the recount.'
            : 'Presence will update after the recount.'
        }
        onReload={onReload}
        error={reloadError}
      />
    );
  }
  if (!mentions) {
    return isNew ? (
      <span className={styles.hint}>Counted after the first save</span>
    ) : (
      <ReloadPresence
        label="Not counted yet — the recount runs shortly."
        onReload={onReload}
        error={reloadError}
      />
    );
  }
  if (mentions.chapters.length === 0) {
    return <span>Not found in any chapter — check name forms</span>;
  }
  return (
    <span>
      {chaptersLabel(mentions.chapters.length)}, first: {mentions.first}
      <span className={styles.hint}>
        {' '}
        Chapters: {mentions.perChapter.map((c) => `${c.chapter} (${c.count})`).join(', ')}
      </span>
    </span>
  );
};

/** Пункты, не сошедшиеся с текстом глав на последнем пересчёте (Q2): в ядро не идут, читателю не видны. */
export const WorldEntityStale: FC<{ stale: string[] }> = ({ stale }) =>
  stale.length > 0 ? (
    <div className={`${styles.issueList} ${styles.error}`} role="alert">
      <p>
        No longer matches the chapter text (not counted in the core, hidden from readers): fix the
        chapter or the item and save. Items are numbered from 0, as in the JSON.
      </p>
      <ul>
        {stale.map((path) => (
          <li key={path}>{path}</li>
        ))}
      </ul>
    </div>
  ) : null;
