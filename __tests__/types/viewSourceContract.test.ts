// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ViewSource } from '@/types/api-schema';

/**
 * T116 (хвост уборки 07.10.2026): тело `POST /views` не проверяется type-sync (сверяется только ответ).
 * `ViewSource` назывался `reader` вместо `text`, и бэкенд отказал бы читалке на первом же вызове.
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
});
