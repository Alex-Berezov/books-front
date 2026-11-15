import type { Dispatch, FC, SetStateAction } from 'react';
import {
  BOOK_WORLD_LIST_FIELDS,
  BOOK_WORLD_ROLES,
  BOOK_WORLD_TEXT_FIELDS,
  type BookWorldIssue,
} from '@/lib/admin/book-world-blocks';
import { formatDataIssue } from '@/lib/admin/data-issue';
import type { WorldEntityFormValues } from '@/lib/admin/book-world-form-state';
import type { WorldEntityType } from '@/types/api-schema';
import styles from './WorldTab.module.scss';

/** Поля формы со своим местом для ошибок — по пути поля тела записи. */
const FIELD_PATHS = [
  'key',
  'name',
  'aliases',
  ...BOOK_WORLD_TEXT_FIELDS.map((f) => f.path),
  ...BOOK_WORLD_LIST_FIELDS.map((f) => f.path),
];

const matches = (issue: BookWorldIssue, path: string) =>
  issue.path === path || issue.path.startsWith(`${path}.`);

/** Ошибки без своего поля (роль, тип, язык) — в общем списке под формой. */
export const unplacedIssues = (issues: BookWorldIssue[]): BookWorldIssue[] =>
  issues.filter((i) => !FIELD_PATHS.some((path) => matches(i, path)));

export const FieldIssues: FC<{ issues: BookWorldIssue[] }> = ({ issues }) =>
  issues.length > 0 ? (
    <ul className={`${styles.issueList} ${styles.error}`}>
      {issues.map((issue, idx) => (
        <li key={idx}>{formatDataIssue(issue)}</li>
      ))}
    </ul>
  ) : null;

interface WorldEntityFieldsProps {
  form: WorldEntityFormValues;
  setForm: Dispatch<SetStateAction<WorldEntityFormValues>>;
  issues: BookWorldIssue[];
  /** Ключ сохранённой сущности (только чтение); `null` — новая, ключ вводится. */
  entityKey: string | null;
  type: WorldEntityType;
  /** Глав с упоминаниями (F08-2); 0 — ещё не посчитано. */
  presence: number;
}

/** Поля героя (`tech.md` §3): тексты — полем, списки — JSON, формы имени — по строке. */
export const WorldEntityFields: FC<WorldEntityFieldsProps> = ({
  form,
  setForm,
  issues,
  entityKey,
  type,
  presence,
}) => {
  const isNew = entityKey === null;
  const issuesFor = (path: string) => issues.filter((i) => matches(i, path));
  const set = (patch: Partial<WorldEntityFormValues>) => setForm((prev) => ({ ...prev, ...patch }));

  return (
    <>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="world-key">
            Key
          </label>
          <input
            id="world-key"
            className={styles.input}
            value={entityKey ?? form.key}
            readOnly={!isNew}
            onChange={(e) => set({ key: e.target.value })}
            spellCheck={false}
          />
          {!isNew && (
            <span className={styles.hint}>The key of a saved entity does not change.</span>
          )}
          <FieldIssues issues={issuesFor('key')} />
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Type</span>
          <span>{type}</span>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="world-name">
            Name
          </label>
          <input
            id="world-name"
            className={styles.input}
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
          />
          <FieldIssues issues={issuesFor('name')} />
        </div>
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
        <div className={styles.field}>
          <span className={styles.label}>Presence</span>
          <span>
            {presence > 0 ? `${presence} chapters` : '—'}
            {presence === 0 && <span className={styles.hint}> Mentions are not counted yet</span>}
          </span>
        </div>
      </div>

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

      {BOOK_WORLD_TEXT_FIELDS.map((field) => (
        <div key={field.key} className={styles.field}>
          <label className={styles.label} htmlFor={`world-text-${field.key}`}>
            {field.label}
          </label>
          <span className={styles.hint}>JSON: {field.path}</span>
          <textarea
            id={`world-text-${field.key}`}
            className={styles.textarea}
            rows={field.rows}
            value={form.texts[field.key]}
            onChange={(e) => {
              const value = e.target.value;
              setForm((prev) => ({ ...prev, texts: { ...prev.texts, [field.key]: value } }));
            }}
          />
          <FieldIssues issues={issuesFor(field.path)} />
        </div>
      ))}

      {BOOK_WORLD_LIST_FIELDS.map((field) => {
        const fieldIssues = issuesFor(field.path);
        const id = `world-list-${field.key}`;
        const text = form.lists[field.key];
        return (
          <div key={field.key} className={styles.field}>
            <label className={styles.label} htmlFor={id}>
              {field.label}
            </label>
            <span className={styles.hint}>JSON list: {field.path}</span>
            <textarea
              id={id}
              className={`${styles.textarea} ${styles.jsonTextarea} ${fieldIssues.length > 0 ? styles.textareaError : ''}`}
              rows={Math.min(14, Math.max(3, text.split('\n').length))}
              value={text}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev) => ({ ...prev, lists: { ...prev.lists, [field.key]: value } }));
              }}
              spellCheck={false}
              aria-invalid={fieldIssues.length > 0}
            />
            <FieldIssues issues={fieldIssues} />
          </div>
        );
      })}
    </>
  );
};
