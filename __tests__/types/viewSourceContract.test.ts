// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { RecordViewRequest, ViewSource } from '@/types/api-schema';

/**
 * T116 (хвост уборки 07.10.2026): тело `POST /views` не проверяется type-sync (сверяется только ответ).
 * `ViewSource` назывался `reader` вместо `text`, и бэкенд отказал бы читалке на первом же вызове.
 * T134 (LEGACY-470): плеер слал `versionId` вместо `bookVersionId` и получал 400 — поэтому здесь же
 * сверяется состав полей тела с `CreateViewDto` из снимка схемы.
 */
const SOURCES = ['text', 'audio', 'referral'] as const;

describe('контракт POST /views: источник просмотра', () => {
  it('ViewSource совпадает с перечислением бэкенда по типу', () => {
    expectTypeOf<ViewSource>().toEqualTypeOf<(typeof SOURCES)[number]>();
  });

  it('перечисление из снимка схемы бэкенда совпадает со списком теста', () => {
    const schema = JSON.parse(
      readFileSync(resolve(__dirname, '../../scripts/type-sync/api-schema.json'), 'utf8')
    );
    expect([...schema.components.schemas.ViewSource.enum].sort()).toEqual([...SOURCES].sort());
  });

  it('поля тела RecordViewRequest совпадают со свойствами CreateViewDto из снимка схемы', () => {
    const schema = JSON.parse(
      readFileSync(resolve(__dirname, '../../scripts/type-sync/api-schema.json'), 'utf8')
    );
    expect(Object.keys(schema.components.schemas.CreateViewDto.properties).sort()).toEqual([
      'bookVersionId',
      'source',
    ]);
    expectTypeOf<keyof RecordViewRequest>().toEqualTypeOf<'bookVersionId' | 'source'>();
  });
});
