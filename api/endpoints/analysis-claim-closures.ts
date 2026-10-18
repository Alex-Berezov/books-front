import type { BookAnalysisClaimClosures } from '@/types/api-schema';

/**
 * Список закрытий анализа блоками окончённых претензий - `GET /analyses/claim-closures`
 * (F03-2, решение арбитра `F03 | F03-2`). Читает только `middleware.ts`, поэтому голый `fetch`
 * без http-клиента: middleware не тянет его зависимости. `null` - список не получен (сбой,
 * таймаут, не `ok`, ответ не той формы): это неизвестность, а не «закрытий нет».
 */
export async function fetchAnalysisClaimClosures(
  apiBaseUrl: string,
  timeoutMs: number
): Promise<BookAnalysisClaimClosures | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${apiBaseUrl}/analyses/claim-closures`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return isClosuresBody(body) ? body : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const isNullableString = (value: unknown): boolean => value === null || typeof value === 'string';

/**
 * Форма проверяется у каждого элемента: элемент без `slugs` или со страной не строкой уронил бы
 * сверку в middleware на каждом заходе (500), а сохранённый в кэше - на весь его срок. Негодный
 * ответ целиком - «списка нет», и работает прежний список.
 */
function isClosure(item: unknown): boolean {
  if (typeof item !== 'object' || item === null) return false;
  const c = item as Record<string, unknown>;
  return (
    Array.isArray(c.slugs) &&
    c.slugs.every((slug) => typeof slug === 'string') &&
    isNullableString(c.language) &&
    isNullableString(c.countryCode) &&
    isNullableString(c.expiresAt) &&
    // Неразборчивый срок дал бы `NaN` и молча открыл анализ в стране блока - это «списка нет».
    (c.expiresAt === null || !Number.isNaN(Date.parse(c.expiresAt as string)))
  );
}

function isClosuresBody(body: unknown): body is BookAnalysisClaimClosures {
  if (typeof body !== 'object' || body === null) return false;
  const items = (body as { items?: unknown }).items;
  return Array.isArray(items) && items.every(isClosure);
}
