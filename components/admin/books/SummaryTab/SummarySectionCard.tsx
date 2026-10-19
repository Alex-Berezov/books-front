'use client';

import { useEffect, useRef, useState, type FC } from 'react';
import { useBookSummarySection } from '@/api/hooks';
import { AdminRichTextEditor } from '@/components/admin/common/AdminRichTextEditor';
import { Button } from '@/components/admin/common/Button';
import { Spinner } from '@/components/admin/shared';
import type {
  BookSummarySectionAdmin,
  BookSummarySectionListItem,
  BookSummarySectionWarning,
} from '@/types/api-schema';
import { SectionWarnings } from './SectionWarnings';
import styles from './SummaryTab.module.scss';
import {
  SECTION_READER_CHAPTER_MAX,
  SECTION_TITLE_MAX_LENGTH,
  STALE_TAB_MESSAGE,
  isStaleSectionError,
  type SectionDraft,
} from './useSummarySections';

interface SummarySectionCardProps {
  section: BookSummarySectionListItem;
  isFirst: boolean;
  isLast: boolean;
  warnings?: BookSummarySectionWarning[];
  orderLocked: boolean;
  onSave: (
    sectionId: string,
    draft: SectionDraft,
    expectedUpdatedAt: string
  ) => Promise<{ updatedAt: string } | { error: string; stale?: boolean }>;
  onDelete: (sectionId: string) => void;
  onMove: (sectionId: string, direction: -1 | 1) => void;
}

/**
 * Карточка раздела пересказа (F04-1): номер ставит сервер, текст грузится по `id` при раскрытии,
 * своя кнопка «Save». Дата для `expectedUpdatedAt` — из загруженного раздела, затем из ответа
 * своего сохранения: два сохранения подряд не получают 409. Отказ устаревшей вкладке оставляет
 * набранный текст и даёт перечитать раздел с сервера.
 */
export const SummarySectionCard: FC<SummarySectionCardProps> = (props) => {
  const { section, isFirst, isLast, warnings, orderLocked, onSave, onDelete, onMove } = props;
  const [open, setOpen] = useState(false);
  const {
    data: full,
    isLoading,
    isError,
    error: loadError,
    refetch,
  } = useBookSummarySection(section.id, open);
  const [draft, setDraft] = useState<SectionDraft | null>(null);
  const [seenUpdatedAt, setSeenUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [saving, setSaving] = useState(false);
  // Черновик правили после загрузки: перечитанный раздел его уже не заменяет.
  const [dirty, setDirty] = useState(false);
  // Текущий черновик для сравнения после ответа сохранения: дописанное во время запроса не ушло.
  const draftRef = useRef<SectionDraft | null>(null);
  draftRef.current = draft;
  // `updatedAt` ответа сервера, из которого заполнен черновик: новый ответ — другая дата.
  const [filledFrom, setFilledFrom] = useState<string | null>(null);

  const fill = (row: BookSummarySectionAdmin) => {
    setDraft({
      title: row.title,
      text: row.text,
      readerChapter: row.readerChapter === null ? '' : String(row.readerChapter),
    });
    setSeenUpdatedAt(row.updatedAt);
    setFilledFrom(row.updatedAt);
    setDirty(false);
  };

  // Раздел перечитывается при каждом раскрытии: свежий ответ заменяет нетронутый черновик (иначе
  // правка ушла бы со старым `expectedUpdatedAt` и получила 409), а набранное не затирает.
  useEffect(() => {
    if (!full) return;
    const fresh = full.updatedAt !== filledFrom && full.updatedAt !== seenUpdatedAt;
    if (!draft || (!dirty && fresh)) fill(full);
  }, [full, draft, dirty, filledFrom, seenUpdatedAt]);

  const change = (patch: Partial<SectionDraft>) => {
    setDirty(true);
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const save = async () => {
    if (!draft || !seenUpdatedAt) return;
    const sent = draft;
    setSaving(true);
    const res = await onSave(section.id, sent, seenUpdatedAt);
    setSaving(false);
    if ('error' in res) {
      setError(res.error);
      setStale(res.stale === true);
      return;
    }
    setError(null);
    setStale(false);
    // Чистый — только если после отправки черновик не меняли.
    if (draftRef.current === sent) setDirty(false);
    setSeenUpdatedAt(res.updatedAt);
  };

  /**
   * Взять раздел с сервера заново — набранное в карточке пропадает. Раздела нет (404) — черновик
   * остаётся с просьбой обновить вкладку: react-query после отказа держит в `data` прежний ответ,
   * и подставить его значило бы показать удалённый раздел живым.
   */
  const reload = async () => {
    const res = await refetch();
    if (res.isError || !res.data) {
      setError(STALE_TAB_MESSAGE);
      setStale(true);
      return;
    }
    fill(res.data);
    setError(null);
    setStale(false);
  };

  const id = `summary-section-${section.id}`;
  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <button
          type="button"
          className={styles.sectionToggle}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {section.number}. {section.title}
        </button>
        <div className={styles.sectionActions}>
          <Button
            size="sm"
            variant="secondary"
            disabled={isFirst || orderLocked}
            onClick={() => onMove(section.id, -1)}
            ariaLabel={`Move section ${section.number} up`}
          >
            Up
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={isLast || orderLocked}
            onClick={() => onMove(section.id, 1)}
            ariaLabel={`Move section ${section.number} down`}
          >
            Down
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={orderLocked}
            onClick={() => onDelete(section.id)}
          >
            Delete
          </Button>
        </div>
      </div>

      {!open && <SectionWarnings warnings={warnings} />}
      {open && isError && !draft && (
        <p className={styles.error} role="alert">
          {isStaleSectionError(loadError)
            ? STALE_TAB_MESSAGE
            : loadError?.message || 'Failed to load the section'}
        </p>
      )}
      {open && !isError && (isLoading || !draft) && <Spinner size="sm" />}
      {open && draft && (
        <div className={styles.sectionBody}>
          <label className={styles.label} htmlFor={`${id}-title`}>
            Title
          </label>
          <input
            id={`${id}-title`}
            className={styles.input}
            value={draft.title}
            maxLength={SECTION_TITLE_MAX_LENGTH}
            onChange={(e) => change({ title: e.target.value })}
          />
          <AdminRichTextEditor
            id={`${id}-text`}
            value={draft.text}
            onChange={(html) => change({ text: html })}
            placeholder="Retell this part of the book..."
            minHeight="240px"
            ariaLabel={`Section ${section.number} text`}
          />
          <label className={styles.label} htmlFor={`${id}-chapter`}>
            Reader chapter
            <span className={styles.labelHint}>
              (optional: the &quot;Read this chapter&quot; link)
            </span>
          </label>
          <input
            id={`${id}-chapter`}
            className={styles.inputNumber}
            type="number"
            min={1}
            max={SECTION_READER_CHAPTER_MAX}
            value={draft.readerChapter}
            onChange={(e) => change({ readerChapter: e.target.value })}
          />
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <SectionWarnings warnings={warnings} />
          <div className={styles.sectionActions}>
            <Button onClick={save} loading={saving} disabled={saving}>
              Save
            </Button>
            {stale && (
              <Button variant="secondary" onClick={reload}>
                Reload section
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
