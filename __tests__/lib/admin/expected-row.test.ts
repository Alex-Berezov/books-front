import { describe, expect, it } from 'vitest';
import { expectedRowOf, expectedRowParams, isRecordChanged } from '@/lib/admin/expected-row';
import { ApiError } from '@/types/api';

describe('expected-row (LEGACY-496)', () => {
  it('«записи нет» - только загруженный null; неизвестное состояние признака не даёт', () => {
    expect(expectedRowOf(null)).toEqual({ expectedAbsent: 'true' });
    expect(expectedRowOf(undefined)).toBeUndefined();
    expect(expectedRowOf({ updatedAt: 'T' })).toEqual({ expectedUpdatedAt: 'T' });
  });

  it('строка запроса: одно поле сверки или пусто', () => {
    expect(expectedRowParams({ expectedAbsent: 'true' })).toBe('expectedAbsent=true');
    expect(expectedRowParams({ expectedUpdatedAt: 'T' })).toBe('expectedUpdatedAt=T');
    expect(expectedRowParams(undefined)).toBe('');
  });

  it('чужая правка - только 409 с кодом', () => {
    const with409 = (data?: Record<string, unknown>) =>
      new ApiError({ statusCode: 409, message: 'm', error: 'Conflict', data });
    expect(isRecordChanged(with409({ code: 'RECORD_CHANGED' }))).toBe(true);
    expect(isRecordChanged(with409())).toBe(false);
    expect(
      isRecordChanged(
        new ApiError({ statusCode: 400, message: 'm', data: { code: 'RECORD_CHANGED' } })
      )
    ).toBe(false);
  });
});
