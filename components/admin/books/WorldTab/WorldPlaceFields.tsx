import type { FC } from 'react';
import { WORLD_PLACE_KINDS, type BookWorldIssue } from '@/lib/admin/book-world-blocks';
import type { WorldEntityFormValues } from '@/lib/admin/book-world-form-state';
import type { BookWorldGeoCheck, WorldGeoReason } from '@/types/api-schema';
import { FieldIssues } from './WorldFieldIssues';
import styles from './WorldTab.module.scss';

/** Пути тела записи у своих полей места вне общих текстов (вид и номер Wikidata) — места ошибок карточки. */
export const PLACE_FIELD_PATHS: readonly string[] = ['kind', 'wikidataId'];

/** Почему у реального места нет точки на карте (`editor.geo.reason`, F08-12a); админка — по-английски. */
export const WORLD_GEO_REASON_TEXT: Record<WorldGeoReason, string> = {
  not_found: 'No point on the map: the Wikidata item is not found.',
  no_coordinates: 'No point on the map: the Wikidata item has no coordinates (P625).',
  not_earth: 'No point on the map: the point is not on Earth.',
  out_of_range: 'No point on the map: the coordinates are out of range.',
  name_mismatch:
    'No point on the map: the Wikidata label does not match the name or the name forms.',
  unavailable:
    'No point on the map yet: Wikidata is unavailable, the point will be rechecked on the next save.',
};
export const WORLD_GEO_VERIFIED = 'Point verified from Wikidata.';
export const WORLD_GEO_NONE = 'No point: a fictional place or no Wikidata ID.';
/** Реальное место с номером, а проверки ещё нет (Wikidata не ответила на первой записи или проход её пропустил). */
export const WORLD_GEO_PENDING = 'Point not checked yet: it will be checked on the next save.';

/**
 * Строка о точке места по последней проверке сервера (`editor.geo`): проверки нет — у реального места
 * с номером она ещё впереди, иначе место вымышленное или без номера; причина — почему точки нет
 * (неизвестный код — сам код); без причины и с датой проверки — точка проверена. Форма уже разошлась
 * с проверенным (не `real` или другой номер) — сохранённый итог не про неё: строка как без проверки.
 */
export const worldGeoStatus = (
  geo: BookWorldGeoCheck | null | undefined,
  form?: Pick<WorldEntityFormValues, 'kind' | 'wikidataId'>
): string | null => {
  const formMoved =
    geo && form && (form.kind !== 'real' || form.wikidataId.trim() !== geo.wikidataId);
  if (!geo || formMoved) {
    return form?.kind === 'real' && form.wikidataId.trim() ? WORLD_GEO_PENDING : WORLD_GEO_NONE;
  }
  if (geo.reason) return WORLD_GEO_REASON_TEXT[geo.reason] ?? geo.reason;
  return geo.checkedAt ? WORLD_GEO_VERIFIED : null;
};

interface WorldPlaceFieldsProps {
  form: WorldEntityFormValues;
  set: (patch: Partial<WorldEntityFormValues>) => void;
  issuesFor: (path: string) => BookWorldIssue[];
  /** Последняя проверка координат сохранённого места; `undefined` — место не сохранено. */
  geo: BookWorldGeoCheck | null | undefined;
}

/**
 * Поля только места (F08-12b): вид (реальное или вымышленное) и номер Wikidata — только у реального,
 * координаты сервер читает из Wikidata сам. Под номером — итог последней проверки точки.
 */
export const WorldPlaceFields: FC<WorldPlaceFieldsProps> = ({ form, set, issuesFor, geo }) => {
  const status = worldGeoStatus(geo, form);
  return (
    <>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="world-place-kind">
          Place kind
        </label>
        <select
          id="world-place-kind"
          className={styles.input}
          value={form.kind}
          onChange={(e) => set({ kind: e.target.value as WorldEntityFormValues['kind'] })}
        >
          <option value="">none</option>
          {WORLD_PLACE_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <FieldIssues issues={issuesFor('kind')} />
        {/* Поле номера скрыто у нереального места, а его ошибка (номер у вымышленного) — нет. */}
        {form.kind !== 'real' && <FieldIssues issues={issuesFor('wikidataId')} />}
      </div>
      {form.kind === 'real' && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor="world-wikidata-id">
            Wikidata ID
          </label>
          <span className={styles.hint}>
            JSON: wikidataId — e.g. Q90; the coordinates are read from Wikidata on save
          </span>
          <input
            id="world-wikidata-id"
            className={styles.input}
            value={form.wikidataId}
            onChange={(e) => set({ wikidataId: e.target.value })}
            spellCheck={false}
          />
          <FieldIssues issues={issuesFor('wikidataId')} />
        </div>
      )}
      {geo !== undefined && status && (
        <p className={styles.hint} role="note">
          {status}
        </p>
      )}
    </>
  );
};
