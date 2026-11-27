import type { Dispatch, FC, SetStateAction } from 'react';
import {
  worldListFieldsOf,
  worldTextFieldsOf,
  type BookWorldIssue,
} from '@/lib/admin/book-world-blocks';
import type { WorldRecountNotice } from './useWorldRecountNotice';
import type { WorldEntityFormValues } from '@/lib/admin/book-world-form-state';
import type { BookWorldGeoCheck, BookWorldMentions, WorldEntityType } from '@/types/api-schema';
import {
  CHARACTER_NAME_PATHS,
  WorldCharacterNameForms,
  WorldCharacterRole,
} from './WorldCharacterFields';
import { WorldEntityPresence, WorldEntityStale } from './WorldEntityPresence';
import { CHARACTER_KEY_RULE } from './worldErrors';
import { FieldIssues, matchesIssuePath } from './WorldFieldIssues';
import { PLACE_FIELD_PATHS, WorldPlaceFields } from './WorldPlaceFields';
import styles from './WorldTab.module.scss';

/** Подсказка у ключа нового героя (`LEGACY-507`). */
const CHARACTER_KEY_HINT = `${CHARACTER_KEY_RULE}: it is reserved for pairs of characters.`;

/**
 * Поля формы со своим местом для ошибок у сущности типа `type` — по пути поля тела записи. Только
 * поля, которые карточка этого типа показывает: ошибка на поле другого типа (`compare` у героя,
 * `aliasChapterExclusions.0` у пары) своего места не имеет.
 */
const fieldPathsOf = (type: WorldEntityType): string[] => [
  'key',
  'name',
  ...(type === 'pair' ? [] : CHARACTER_NAME_PATHS),
  ...(type === 'place' ? PLACE_FIELD_PATHS : []),
  ...worldTextFieldsOf(type).map((f) => f.path),
  ...worldListFieldsOf(type).map((f) => f.path),
];

/** Ошибки без своего поля в карточке типа `type` (роль, тип, язык, поле другого типа) — в общем списке. */
export const unplacedIssues = (
  issues: BookWorldIssue[],
  type: WorldEntityType
): BookWorldIssue[] => {
  const paths = fieldPathsOf(type);
  return issues.filter((i) => !paths.some((path) => matchesIssuePath(i, path)));
};

interface WorldEntityFieldsProps {
  form: WorldEntityFormValues;
  setForm: Dispatch<SetStateAction<WorldEntityFormValues>>;
  issues: BookWorldIssue[];
  /** Ключ сохранённой сущности (только чтение); `null` — новая, ключ вводится. */
  entityKey: string | null;
  type: WorldEntityType;
  /** Посчитанное присутствие (F08-2); `null` — ещё не посчитано (новая сущность). */
  mentions: BookWorldMentions | null;
  /** Пункты, не сошедшиеся с текстом глав на последнем пересчёте (`quotes.2`). */
  stale: string[];
  /** У версии есть главы; `null` — неизвестно (новая сущность). */
  versionHasChapters: boolean | null;
  /** У версии стоит пересчёт: `saved` — его поставила запись этой карточки (решения арбитра S5, S6). */
  recountNotice: WorldRecountNotice;
  onReloadPresence: () => void;
  /** Отказ Reload присутствия; `null` — не было. */
  presenceReloadError: string | null;
  /** Только у места (F08-12b): последняя проверка точки (`editor.geo`); `undefined` — не сохранено. */
  geo?: BookWorldGeoCheck | null;
}

/**
 * Поля героя (`tech.md` §3): тексты — полем, списки — JSON, формы имени — по строке. У пары (F08-8c)
 * свои поля и общие; роли, форм имени, исключений и полей героя у неё нет, а присутствие — общие
 * главы героев, только чтение. У места (F08-12b) — формы имени, вид, номер Wikidata и свои поля; роли
 * и полей героя у него нет. У предмета, понятия и события (F08-13b) — формы имени и поля своего перечня
 * (`worldTextFieldsOf`, `worldListFieldsOf`), связи с героями и темами — JSON-списком ключей; роли,
 * полей героя и ТЗ на иллюстрацию у них нет.
 */
export const WorldEntityFields: FC<WorldEntityFieldsProps> = ({
  form,
  setForm,
  issues,
  entityKey,
  type,
  mentions,
  stale,
  versionHasChapters,
  recountNotice,
  onReloadPresence,
  presenceReloadError,
  geo,
}) => {
  const isNew = entityKey === null;
  const isPair = type === 'pair';
  const isCharacter = type === 'character';
  const issuesFor = (path: string) => issues.filter((i) => matchesIssuePath(i, path));
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
          {isNew && isCharacter && <span className={styles.hint}>{CHARACTER_KEY_HINT}</span>}
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
        {isCharacter && <WorldCharacterRole form={form} set={set} />}
        <div className={styles.field}>
          <span className={styles.label}>{isPair ? 'Shared chapters' : 'Presence'}</span>
          <WorldEntityPresence
            isPair={isPair}
            mentions={mentions}
            isNew={isNew}
            versionHasChapters={versionHasChapters}
            recountNotice={recountNotice}
            onReload={onReloadPresence}
            reloadError={presenceReloadError}
          />
        </div>
      </div>

      <WorldEntityStale stale={stale} />

      {!isPair && <WorldCharacterNameForms form={form} set={set} issuesFor={issuesFor} />}

      {type === 'place' && (
        <WorldPlaceFields form={form} set={set} issuesFor={issuesFor} geo={geo} />
      )}

      {worldTextFieldsOf(type).map((field) => (
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

      {worldListFieldsOf(type).map((field) => {
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
