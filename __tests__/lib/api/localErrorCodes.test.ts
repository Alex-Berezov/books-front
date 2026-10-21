// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isHandledLocally, localErrorCodes } from '@/lib/api/local-error-codes';
import { ApiError } from '@/types/api';

/**
 * Общий тост 5xx (`providers/AppProviders.tsx`) не показывается на код, который экран разбирает
 * сам (F05-1s, 503 `LLM_MODELS_UNAVAILABLE`). Прочие 5xx того же запроса — по-прежнему тост.
 */

const error503 = (code?: string) =>
  new ApiError({ statusCode: 503, message: 'x', ...(code ? { data: { code } } : {}) });

describe('isHandledLocally', () => {
  const meta = localErrorCodes(['LLM_MODELS_UNAVAILABLE']);

  it('объявленный код — экран разбирает сам', () => {
    expect(isHandledLocally(error503('LLM_MODELS_UNAVAILABLE'), meta)).toBe(true);
  });

  it('другой код или код не пришёл — общий тост остаётся', () => {
    expect(isHandledLocally(error503('SOMETHING_ELSE'), meta)).toBe(false);
    expect(isHandledLocally(error503(), meta)).toBe(false);
  });

  it('запрос без объявленных кодов — общий тост остаётся', () => {
    expect(isHandledLocally(error503('LLM_MODELS_UNAVAILABLE'), undefined)).toBe(false);
    expect(isHandledLocally(error503('LLM_MODELS_UNAVAILABLE'), { other: true })).toBe(false);
  });
});
