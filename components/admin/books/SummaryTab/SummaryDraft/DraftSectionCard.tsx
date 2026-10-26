'use client';

import { useState, type FC } from 'react';
import { refusalText } from '@/components/admin/books/ContentDraft';
import { AdminRichTextEditor } from '@/components/admin/common/AdminRichTextEditor';
import { Button } from '@/components/admin/common/Button';
import type { ContentDraftSection } from '@/types/api-schema';
import styles from '../SummaryTab.module.scss';
import {
  SECTION_READER_CHAPTER_MAX,
  SECTION_TITLE_MAX_LENGTH,
  type SectionDraft,
} from '../useSummarySections';

export interface DraftSectionCardProps {
  section: ContentDraftSection;
  /** «Add section» вкладки: `true` — сохранён, строка — отказ. */
  onAdd: (draft: SectionDraft) => Promise<string | true>;
  /** Отметка «раздел добавлен» на заготовке (решение `F05 | F05-10`, Р1). */
  onMarkAdded: (sectionNumber: number) => Promise<unknown>;
  adding: boolean;
  /** Раздел уже добавлен — по отметке сервера, а не по совпадению заголовка. */
  added: boolean;
  /**
   * Заготовка не `ready` (строится или упала): карточка только для чтения, без «Add section» —
   * отметку сервер примет только у готовой (решение арбитра `F05 | F05-10`, круг 3), иначе
   * созданный раздел остался бы неотмеченным и после перезагрузки дал бы дубль.
   */
  readOnly: boolean;
}

/**
 * Карточка-черновик раздела из заготовки (F05-10): редактор правит её и сохраняет кнопкой
 * «Add section» — раздел встаёт в конец, как набранный руками, и заготовка отмечает его
 * добавленным (после перезагрузки карточка не предлагается снова). Без нажатия ничего не пишется.
 */
export const DraftSectionCard: FC<DraftSectionCardProps> = ({
  section,
  onAdd,
  onMarkAdded,
  adding,
  added,
  readOnly,
}) => {
  const [draft, setDraft] = useState<SectionDraft>({
    title: section.title,
    text: section.text,
    readerChapter: section.readerChapter === null ? '' : String(section.readerChapter),
  });
  const [error, setError] = useState<string | null>(null);
  // Раздел создан, а отметка не легла: повторяется только отметка, не создание (иначе дубль).
  const [created, setCreated] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const done = added || (created && markError === null && !marking);
  const id = `summary-draft-section-${section.number}`;

  const mark = async () => {
    setMarking(true);
    setMarkError(null);
    try {
      await onMarkAdded(section.number);
    } catch (e) {
      setMarkError(refusalText(e));
    } finally {
      setMarking(false);
    }
  };

  const add = async () => {
    const res = await onAdd(draft);
    if (res !== true) {
      setError(res);
      return;
    }
    setError(null);
    setCreated(true);
    await mark();
  };

  if (done) {
    return (
      <div className={styles.sectionCard} aria-label={`Draft section ${section.number}`}>
        <p className={styles.label}>{draft.title}</p>
        <p className={styles.labelHint} role="status">
          Saved as a section. Edit it in its card above.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.sectionCard} aria-label={`Draft section ${section.number}`}>
      <label className={styles.label} htmlFor={`${id}-title`}>
        Draft section {section.number} title
      </label>
      <input
        id={`${id}-title`}
        className={styles.input}
        value={draft.title}
        maxLength={SECTION_TITLE_MAX_LENGTH}
        disabled={created}
        onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
      />
      {section.text === '' && (
        <p className={styles.labelHint}>
          The chapters of this section have no text in this version: the title is from the dossier
          plan, write the text by hand.
        </p>
      )}
      {!created && (
        <AdminRichTextEditor
          id={`${id}-text`}
          value={draft.text}
          onChange={(html) => setDraft((prev) => ({ ...prev, text: html }))}
          minHeight="160px"
          ariaLabel={`Draft section ${section.number} text`}
        />
      )}
      <label className={styles.label} htmlFor={`${id}-chapter`}>
        Reader chapter
      </label>
      <input
        id={`${id}-chapter`}
        className={styles.inputNumber}
        type="number"
        min={1}
        max={SECTION_READER_CHAPTER_MAX}
        value={draft.readerChapter}
        disabled={created}
        onChange={(e) => setDraft((prev) => ({ ...prev, readerChapter: e.target.value }))}
      />
      {section.readerChapterMissing && (
        <p className={styles.labelHint}>
          The plan chapter of this section is not among the chapters of this version: set the reader
          chapter by hand.
        </p>
      )}
      {section.additions && (
        <p className={styles.labelHint}>Not in the dossier: {section.additions}</p>
      )}
      {section.question && (
        <p className={styles.labelHint}>Question from the model: {section.question}</p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {readOnly ? (
        <p className={styles.labelHint} role="status">
          The draft is not ready: sections can be added once it is ready.
        </p>
      ) : created ? (
        markError !== null && (
          <>
            <p className={styles.error} role="alert">
              The section is saved, but the draft did not record it: {markError}
            </p>
            <Button onClick={mark} loading={marking} disabled={marking}>
              Retry the mark
            </Button>
          </>
        )
      ) : (
        <Button onClick={add} loading={adding} disabled={adding}>
          Add section
        </Button>
      )}
    </div>
  );
};
