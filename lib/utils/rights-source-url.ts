import type { RightsSourceProvider } from '@/types/api-schema/rights-intake';

/**
 * WP-F.1 / WP-M.1: провайдер и внешний ID источника, выведенные из ссылки.
 *
 * Это догадка приложения, а не факт, установленный человеком: она заполняет только пустые
 * поля формы и повторяет разбор бэкенда (`rights-intake-source-url.util.ts` в `books`).
 * Расхождение двух разборов — это разные значения в форме и в базе, поэтому правятся они
 * всегда вместе.
 */
export type DerivedSourceKind = 'GUTENBERG' | 'COMMUNITY_WIKI' | 'DIGITAL_LIBRARY' | 'UNKNOWN_WEB';

export interface DerivedRightsSource {
  provider: Extract<RightsSourceProvider, 'PROJECT_GUTENBERG' | 'OTHER'>;
  externalId: string | null;
  /** Человекочитаемое имя площадки: «Project Gutenberg», «Wikisource (ru)», либо хост. */
  providerHint: string;
  kind: DerivedSourceKind;
}

const GUTENBERG_HOST = /(^|\.)gutenberg\.org$/i;

const GUTENBERG_ID_PATTERNS: readonly RegExp[] = [
  /\/ebooks\/(\d+)/i,
  /\/files\/(\d+)/i,
  /\/cache\/epub\/(\d+)/i,
  /\/etext\/(\d+)/i,
];

const WIKI_HOST = /(^|\.)(wikisource|wikipedia|wikibooks|wikimedia)\.org$/i;
const ARCHIVE_HOST = /(^|\.)archive\.org$/i;
const STANDARD_EBOOKS_HOST = /(^|\.)standardebooks\.org$/i;
const HATHITRUST_HOST = /(^|\.)hathitrust\.org$/i;

const WIKI_TITLE_PATTERN = /\/wiki\/(.+)$/i;
const ARCHIVE_ID_PATTERN = /\/details\/([^/]+)/i;
const STANDARD_EBOOKS_ID_PATTERN = /\/ebooks\/(.+?)\/?$/i;

const decodePathSegment = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const wikiProviderHint = (hostname: string): string => {
  const parts = hostname
    .toLowerCase()
    .replace(/^www\./, '')
    .split('.');
  const project = parts.length >= 2 ? parts[parts.length - 2] : hostname;
  const projectName = project.charAt(0).toUpperCase() + project.slice(1);
  const language = parts.length >= 3 ? parts[0] : null;
  return language ? `${projectName} (${language})` : projectName;
};

const deriveGutenberg = (parsed: URL): DerivedRightsSource => {
  for (const pattern of GUTENBERG_ID_PATTERNS) {
    const match = pattern.exec(parsed.pathname);
    if (match) {
      return {
        provider: 'PROJECT_GUTENBERG',
        externalId: match[1],
        providerHint: 'Project Gutenberg',
        kind: 'GUTENBERG',
      };
    }
  }

  return {
    provider: 'PROJECT_GUTENBERG',
    externalId: null,
    providerHint: 'Project Gutenberg',
    kind: 'GUTENBERG',
  };
};

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

  const hostname = parsed.hostname;

  if (GUTENBERG_HOST.test(hostname)) return deriveGutenberg(parsed);

  if (WIKI_HOST.test(hostname)) {
    const match = WIKI_TITLE_PATTERN.exec(parsed.pathname);
    return {
      provider: 'OTHER',
      externalId: match ? decodePathSegment(match[1]) : null,
      providerHint: wikiProviderHint(hostname),
      kind: 'COMMUNITY_WIKI',
    };
  }

  if (ARCHIVE_HOST.test(hostname)) {
    const match = ARCHIVE_ID_PATTERN.exec(parsed.pathname);
    return {
      provider: 'OTHER',
      externalId: match ? decodePathSegment(match[1]) : null,
      providerHint: 'Internet Archive',
      kind: 'DIGITAL_LIBRARY',
    };
  }

  if (STANDARD_EBOOKS_HOST.test(hostname)) {
    const match = STANDARD_EBOOKS_ID_PATTERN.exec(parsed.pathname);
    return {
      provider: 'OTHER',
      externalId: match ? decodePathSegment(match[1]) : null,
      providerHint: 'Standard Ebooks',
      kind: 'DIGITAL_LIBRARY',
    };
  }

  if (HATHITRUST_HOST.test(hostname)) {
    const id = parsed.searchParams.get('id');
    return {
      provider: 'OTHER',
      externalId: id && id.trim() !== '' ? id.trim() : null,
      providerHint: 'HathiTrust',
      kind: 'DIGITAL_LIBRARY',
    };
  }

  return {
    provider: 'OTHER',
    externalId: null,
    providerHint: hostname.replace(/^www\./i, ''),
    kind: 'UNKNOWN_WEB',
  };
};

/**
 * WP-M.1: у незнакомой площадки тип текста не выводится даже при совпадении языков —
 * про сайт, о котором ничего не известно, `ORIGINAL_TEXT` был бы догадкой на догадке.
 */
export const mayInferTextTypeFrom = (derived: DerivedRightsSource | null): boolean =>
  derived !== null && derived.kind !== 'UNKNOWN_WEB';
