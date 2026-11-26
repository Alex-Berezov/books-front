import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  WORLD_GEO_NONE,
  WORLD_GEO_PENDING,
  WORLD_GEO_REASON_TEXT,
  WORLD_GEO_VERIFIED,
  WorldPlaceFields,
  worldGeoStatus,
} from '@/components/admin/books/WorldTab/WorldPlaceFields';
import { formFromWorldEntity, type WorldEntityFormValues } from '@/lib/admin/book-world-form-state';
import type { BookWorldIssue } from '@/lib/admin/book-world-blocks';
import type { BookWorldGeoCheck, WorldGeoReason } from '@/types/api-schema';

/**
 * F08-12b: поля места в карточке World — вид, номер Wikidata только у реального и причина
 * отсутствия точки по `editor.geo` (английские строки админки, решение `F08 | F08-12b` о языке).
 */

const geo = (reason: WorldGeoReason | null, checkedAt: string | null = '2026-11-25T00:00:00Z') =>
  ({ wikidataId: 'Q656', checkedAt, reason }) satisfies BookWorldGeoCheck;

const Harness = ({
  initial,
  value,
  issues = [],
}: {
  initial: Partial<WorldEntityFormValues>;
  value: BookWorldGeoCheck | null | undefined;
  issues?: BookWorldIssue[];
}) => {
  const [form, setForm] = useState({ ...formFromWorldEntity(null), ...initial });
  return (
    <WorldPlaceFields
      form={form}
      set={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
      issuesFor={(path) => issues.filter((i) => i.path === path)}
      geo={value}
    />
  );
};

const REASONS: WorldGeoReason[] = [
  'not_found',
  'no_coordinates',
  'not_earth',
  'out_of_range',
  'name_mismatch',
  'unavailable',
];

describe('WorldPlaceFields: point status (F08-12b)', () => {
  it('each of the 6 reason codes has its own line', () => {
    expect(Object.keys(WORLD_GEO_REASON_TEXT).sort()).toEqual([...REASONS].sort());
    expect(new Set(Object.values(WORLD_GEO_REASON_TEXT)).size).toBe(REASONS.length);
  });

  it.each(REASONS)('reason %s is shown in the place card', (reason) => {
    render(<Harness initial={{ kind: 'real', wikidataId: 'Q656' }} value={geo(reason)} />);
    expect(screen.getByRole('note')).toHaveTextContent(WORLD_GEO_REASON_TEXT[reason]);
  });

  it('the texts say what happened (Wikidata item, P625, Earth, range, label, recheck)', () => {
    expect(WORLD_GEO_REASON_TEXT.not_found).toMatch(/item is not found/);
    expect(WORLD_GEO_REASON_TEXT.no_coordinates).toMatch(/P625/);
    expect(WORLD_GEO_REASON_TEXT.not_earth).toMatch(/not on Earth/);
    expect(WORLD_GEO_REASON_TEXT.out_of_range).toMatch(/out of range/);
    expect(WORLD_GEO_REASON_TEXT.name_mismatch).toMatch(/label does not match/);
    expect(WORLD_GEO_REASON_TEXT.unavailable).toMatch(/unavailable.*rechecked on the next save/);
  });

  // /qa круг 1 (code-review, front-correctness): реальное место с номером без проверки и неизвестный код.
  it('a real place with an ID and no check yet: not checked yet; an unknown reason code: the code itself', () => {
    expect(worldGeoStatus(null, { kind: 'real', wikidataId: 'Q656' })).toBe(WORLD_GEO_PENDING);
    expect(worldGeoStatus(null, { kind: 'real', wikidataId: ' ' })).toBe(WORLD_GEO_NONE);
    expect(worldGeoStatus(null, { kind: 'fictional', wikidataId: 'Q656' })).toBe(WORLD_GEO_NONE);
    render(<Harness initial={{ kind: 'real', wikidataId: 'Q656' }} value={null} />);
    expect(screen.getByRole('note')).toHaveTextContent(WORLD_GEO_PENDING);
    expect(worldGeoStatus({ wikidataId: 'Q1', checkedAt: null, reason: 'new_code' as never })).toBe(
      'new_code'
    );
    expect(worldGeoStatus({ wikidataId: 'Q1', checkedAt: null, reason: null })).toBeNull();
  });

  it('no reason and a check date: the point is verified', () => {
    expect(worldGeoStatus(geo(null))).toBe(WORLD_GEO_VERIFIED);
    render(<Harness initial={{ kind: 'real', wikidataId: 'Q656' }} value={geo(null)} />);
    expect(screen.getByRole('note')).toHaveTextContent(WORLD_GEO_VERIFIED);
  });

  it('no check (fictional or no ID): the line says so; an unsaved place shows nothing', () => {
    expect(worldGeoStatus(null)).toBe(WORLD_GEO_NONE);
    const { unmount } = render(<Harness initial={{ kind: 'fictional' }} value={null} />);
    expect(screen.getByRole('note')).toHaveTextContent(WORLD_GEO_NONE);
    unmount();
    render(<Harness initial={{}} value={undefined} />);
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('Wikidata ID is shown only for a real place', () => {
    render(<Harness initial={{ kind: 'fictional' }} value={null} />);
    expect(screen.queryByLabelText('Wikidata ID')).toBeNull();
    fireEvent.change(screen.getByLabelText('Place kind'), { target: { value: 'real' } });
    expect(screen.getByLabelText('Wikidata ID')).toBeInTheDocument();
  });
  // /qa круг 2 (front-correctness): сохранённый итог — про проверенный номер, не про изменённую форму.
  it('the form moved off the checked ID or kind: the saved result is not shown', () => {
    expect(worldGeoStatus(geo(null), { kind: 'real', wikidataId: 'Q656' })).toBe(
      WORLD_GEO_VERIFIED
    );
    expect(worldGeoStatus(geo('not_found'), { kind: 'real', wikidataId: 'Q90' })).toBe(
      WORLD_GEO_PENDING
    );
    expect(worldGeoStatus(geo(null), { kind: 'fictional', wikidataId: 'Q656' })).toBe(
      WORLD_GEO_NONE
    );
    expect(worldGeoStatus(geo('not_found'), { kind: 'real', wikidataId: ' ' })).toBe(
      WORLD_GEO_NONE
    );
    render(<Harness initial={{ kind: 'real', wikidataId: 'Q656' }} value={geo(null)} />);
    fireEvent.change(screen.getByLabelText('Wikidata ID'), { target: { value: 'Q90' } });
    expect(screen.getByRole('note')).toHaveTextContent(WORLD_GEO_PENDING);
    fireEvent.change(screen.getByLabelText('Place kind'), { target: { value: 'fictional' } });
    expect(screen.getByRole('note')).toHaveTextContent(WORLD_GEO_NONE);
  });

  // Текст ошибки - как его даёт правило схемы (lib/admin/book-world.schema.ts, `wikidataId` только у real).
  it('a wikidataId error stays visible when the field is hidden (not a real place)', () => {
    const issues = [
      { path: 'wikidataId', message: 'wikidataId is only for a real place (kind: real)' },
    ];
    render(
      <Harness initial={{ kind: 'fictional', wikidataId: 'Q656' }} value={null} issues={issues} />
    );
    expect(screen.queryByLabelText('Wikidata ID')).toBeNull();
    expect(
      screen.getByText('wikidataId: wikidataId is only for a real place (kind: real)')
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Place kind'), { target: { value: 'real' } });
    expect(
      screen.getAllByText('wikidataId: wikidataId is only for a real place (kind: real)')
    ).toHaveLength(1);
  });
});
