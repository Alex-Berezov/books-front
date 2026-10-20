import { describe, expect, it } from 'vitest';
import { parseOrdinal } from '@/lib/utils/ordinal-param';

describe('parseOrdinal (F04 tech.md T3: номер главы читалки и раздела пересказа)', () => {
  it.each(['1', '2', '10', '999999'])('%s - номер', (raw) => {
    expect(parseOrdinal(raw)).toBe(Number(raw));
  });

  it.each(['0', '01', '007', 'abc', '1.5', '-1', '+1', '1e3', ' 1', '1 ', '', '1000000', '1/x'])(
    '%j - не номер',
    (raw) => {
      expect(parseOrdinal(raw)).toBeNull();
    }
  );

  it('нет значения - не номер', () => {
    expect(parseOrdinal(null)).toBeNull();
    expect(parseOrdinal(undefined)).toBeNull();
  });
});
