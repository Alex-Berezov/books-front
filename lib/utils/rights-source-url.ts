import type { RightsSourceProvider } from '@/types/api-schema/rights-intake';

/**
 * WP-F.1: провайдер и внешний ID источника, выведенные из ссылки.
 *
 * Это догадка приложения, а не факт, установленный человеком: она заполняет только пустые
 * поля формы и повторяет разбор бэкенда (`rights-intake-source-url.util.ts`).
 */
export interface DerivedRightsSource {
  provider: Extract<RightsSourceProvider, 'PROJECT_GUTENBERG'>;
  externalId: string | null;
}

const GUTENBERG_HOST = /(^|\.)gutenberg\.org$/i;

const GUTENBERG_ID_PATTERNS: readonly RegExp[] = [
  /\/ebooks\/(\d+)/i,
  /\/files\/(\d+)/i,
  /\/cache\/epub\/(\d+)/i,
  /\/etext\/(\d+)/i,
];

export const deriveRightsSourceFromUrl = (url: string): DerivedRightsSource | null => {
  const trimmed = url.trim();
  if (trimmed === '') return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (!GUTENBERG_HOST.test(parsed.hostname)) return null;

  for (const pattern of GUTENBERG_ID_PATTERNS) {
    const match = pattern.exec(parsed.pathname);
    if (match) return { provider: 'PROJECT_GUTENBERG', externalId: match[1] };
  }

  return { provider: 'PROJECT_GUTENBERG', externalId: null };
};
