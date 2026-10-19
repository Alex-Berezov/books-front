'use client';

import { useState, type FC } from 'react';
import { AdminRichTextEditor } from '@/components/admin/common/AdminRichTextEditor';
import { Button } from '@/components/admin/common/Button';
import { ConfirmDialog, Spinner } from '@/components/admin/shared';
import { SectionWarnings } from './SectionWarnings';
import { SummarySectionCard } from './SummarySectionCard';
import styles from './SummaryTab.module.scss';
import {
  SECTION_READER_CHAPTER_MAX,
  SECTION_TITLE_MAX_LENGTH,
  useSummarySections,
  type SectionDraft,
} from './useSummarySections';

const EMPTY_DRAFT: SectionDraft = { title: '', text: '', readerChapter: '' };

/**
 * Разделы пересказа (F04-1, `product.md` §7 п.3-п.6): карточка на раздел, добавление в конец,
 * удаление и перестановка с подтверждением. Видны и правятся и до полного пересказа.
 */
export const SummarySections: FC<{ versionId: string }> = ({ versionId }) => {
  const tab = useSummarySections(versionId);
  const [draft, setDraft] = useState<SectionDraft>(EMPTY_DRAFT);
  const [addError, setAddError] = useState<string | null>(null);

  const edit = (patch: Partial<SectionDraft>) => {
    tab.clearAddWarnings();
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const add = async () => {
    const res = await tab.addSection(draft);
    if (res === true) {
      setDraft(EMPTY_DRAFT);
      setAddError(null);
      return;
    }
    setAddError(res);
  };

  return (
    <section className={styles.sections} aria-labelledby="summary-sections-title">
      <h3 id="summary-sections-title" className={styles.sectionsTitle}>
        Summary sections
        <span className={styles.labelHint}>
          (Each section retells its part of the book in more detail than the full summary, not a
          copy of it. Plot only. The number is the section address, so deleting or moving a section
          renumbers the following ones)
        </span>
      </h3>

      {tab.isLoading && <Spinner size="md" />}
      {!tab.isLoading && !tab.loadError && tab.sections.length === 0 && (
        <p className={styles.labelHint}>No sections yet.</p>
      )}
      {tab.loadError && (
        <p className={styles.error} role="alert">
          {tab.loadError}
        </p>
      )}
      {tab.sections.map((section, index) => (
        <SummarySectionCard
          key={section.id}
          section={section}
          isFirst={index === 0}
          isLast={index === tab.sections.length - 1}
          warnings={tab.warnings[section.id]}
          orderLocked={tab.isChangingOrder}
          onSave={tab.saveSection}
          onDelete={tab.requestDelete}
          onMove={tab.requestMove}
        />
      ))}

      <div className={styles.sectionCard}>
        <label className={styles.label} htmlFor="summary-section-new-title">
          New section title
        </label>
        <input
          id="summary-section-new-title"
          className={styles.input}
          value={draft.title}
          maxLength={SECTION_TITLE_MAX_LENGTH}
          onChange={(e) => edit({ title: e.target.value })}
        />
        <AdminRichTextEditor
          id="summary-section-new-text"
          value={draft.text}
          onChange={(html) => edit({ text: html })}
          placeholder="Retell this part of the book..."
          minHeight="160px"
          ariaLabel="New section text"
        />
        <label className={styles.label} htmlFor="summary-section-new-chapter">
          Reader chapter
          <span className={styles.labelHint}>
            (optional: the &quot;Read this chapter&quot; link)
          </span>
        </label>
        <input
          id="summary-section-new-chapter"
          className={styles.inputNumber}
          type="number"
          min={1}
          max={SECTION_READER_CHAPTER_MAX}
          value={draft.readerChapter}
          onChange={(e) => edit({ readerChapter: e.target.value })}
        />
        {addError && (
          <p className={styles.error} role="alert">
            {addError}
          </p>
        )}
        <SectionWarnings warnings={tab.addWarnings} />
        <Button onClick={add} loading={tab.isAdding} disabled={tab.isAdding}>
          Add section
        </Button>
      </div>

      <ConfirmDialog
        isOpen={tab.pending !== null}
        title={tab.pending?.kind === 'delete' ? 'Delete section' : 'Move section'}
        message={tab.pendingMessage}
        confirmLabel={tab.pending?.kind === 'delete' ? 'Delete' : 'Move'}
        isDestructive={tab.pending?.kind === 'delete'}
        onConfirm={tab.confirmPending}
        onCancel={tab.cancelPending}
      />
    </section>
  );
};
