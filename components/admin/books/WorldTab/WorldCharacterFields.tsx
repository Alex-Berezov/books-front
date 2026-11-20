import type { FC } from 'react';
import { BOOK_WORLD_ROLES, type BookWorldIssue } from '@/lib/admin/book-world-blocks';
import type { WorldEntityFormValues } from '@/lib/admin/book-world-form-state';
import { FieldIssues } from './WorldFieldIssues';
import styles from './WorldTab.module.scss';

/**
 * Поля только героя (`tech.md` §3): роль, формы имени и исключения форм. У пары (F08-8c) их нет -
 * карточка пары эти поля не показывает.
 */

interface WorldCharacterFieldProps {
  form: WorldEntityFormValues;
  set: (patch: Partial<WorldEntityFormValues>) => void;
}

export const WorldCharacterRole: FC<WorldCharacterFieldProps> = ({ form, set }) => (
  <div className={styles.field}>
    <label className={styles.label} htmlFor="world-role">
      Role
    </label>
    <select
      id="world-role"
      className={styles.input}
      value={form.role}
      onChange={(e) => set({ role: e.target.value as WorldEntityFormValues['role'] })}
    >
      <option value="">none</option>
      {BOOK_WORLD_ROLES.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  </div>
);

interface WorldCharacterNameFormsProps extends WorldCharacterFieldProps {
  /** Ошибки поля по пути тела записи. */
  issuesFor: (path: string) => BookWorldIssue[];
}

export const WorldCharacterNameForms: FC<WorldCharacterNameFormsProps> = ({
  form,
  set,
  issuesFor,
}) => (
  <>
    <div className={styles.field}>
      <label className={styles.label} htmlFor="world-aliases">
        Name forms (one per line)
      </label>
      <span className={styles.hint}>JSON: aliases</span>
      <textarea
        id="world-aliases"
        className={styles.textarea}
        rows={3}
        value={form.aliases}
        onChange={(e) => set({ aliases: e.target.value })}
      />
      <FieldIssues issues={issuesFor('aliases')} />
    </div>

    <div className={styles.field}>
      <label className={styles.label} htmlFor="world-alias-exclusions">
        Excluded name forms (one per line)
      </label>
      <span className={styles.hint}>
        JSON: aliasExclusions — not counted anywhere: an ordinary word, or a surname a namesake
        shares; if the hero then has no chapters, take the surname out of here and limit it to the
        namesake&apos;s chapters below
      </span>
      <textarea
        id="world-alias-exclusions"
        className={styles.textarea}
        rows={2}
        value={form.aliasExclusions}
        onChange={(e) => set({ aliasExclusions: e.target.value })}
      />
      <FieldIssues issues={issuesFor('aliasExclusions')} />
    </div>

    <div className={styles.field}>
      <label className={styles.label} htmlFor="world-alias-chapter-exclusions">
        Excluded chapters per name form (one per line: form: chapters)
      </label>
      <span className={styles.hint}>
        JSON: aliasChapterExclusions — namesakes, e.g. the line «Simon: 6, 15» drops only this form,
        only in these chapters; the form is the name or one of the name forms (else no effect), each
        grammatical case its own line
      </span>
      <textarea
        id="world-alias-chapter-exclusions"
        className={styles.textarea}
        rows={2}
        value={form.aliasChapterExclusions}
        onChange={(e) => set({ aliasChapterExclusions: e.target.value })}
      />
      <FieldIssues issues={issuesFor('aliasChapterExclusions')} />
    </div>
  </>
);
