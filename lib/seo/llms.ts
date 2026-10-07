import { getDictionary } from '@/lib/i18n/dictionaries';
import { LANGUAGE_LABELS, SUPPORTED_LANGS } from '@/lib/i18n/lang';
import { buildLangUrl, buildPublicUrl } from '@/lib/seo/urls';
import type { HasLanding, LandingKey } from '@/lib/seo/landing-presence';

type LlmsHubLabel =
  | 'catalog'
  | 'audiobooks'
  | 'popular'
  | 'newReleases'
  | 'categories'
  | 'genres'
  | 'collections'
  | 'tags'
  | 'authors';

const ENGLISH_LANGUAGE_NAMES = new Intl.DisplayNames(['en'], { type: 'language' });

/**
 * Public hubs under `/:lang`: the route part after the language and the `header.*` dictionary key
 * for its label. Mirrors the header navigation (`components/public/layout/Header.tsx`) and the hub
 * entries allowed in `app/robots.ts`; `__tests__/app/llmsTxt.test.ts` fails when a hub allowed in
 * robots is missing here. Private sections (`auth`, `profile`, `bookshelf`, `admin`, `api`) never
 * belong in this list. `landing` marks a count-gated landing that is left out for a language
 * where it is known to be empty, exactly as the sitemap does.
 */
export const LLMS_HUBS: readonly { path: string; label: LlmsHubLabel; landing?: LandingKey }[] = [
  { path: '/catalog', label: 'catalog' },
  { path: '/audiobooks', label: 'audiobooks', landing: 'audiobooks' },
  { path: '/popular-books', label: 'popular', landing: 'popular' },
  { path: '/new-releases', label: 'newReleases', landing: 'new' },
  { path: '/categories', label: 'categories' },
  { path: '/genres', label: 'genres' },
  { path: '/collections', label: 'collections' },
  { path: '/tags', label: 'tags' },
  { path: '/authors', label: 'authors' },
];

/** Link text comes from dictionaries; brackets in it would break the Markdown link. */
const escapeLinkText = (text: string): string => text.replace(/[[\]\\]/g, (ch) => `\\${ch}`);

/**
 * Body of `/llms.txt` in the llmstxt.org format: Markdown with a single H1, a blockquote summary,
 * then H2 sections with link lists. Lighthouse ("agentic browsing") requires Markdown with an H1.
 * Languages, labels and the site origin come from `SUPPORTED_LANGS`, the dictionaries and
 * `lib/seo/urls`, so a new language shows up here without touching this file.
 */
export function buildLlmsTxt(hasLanding: HasLanding): string {
  const en = getDictionary('en');
  const lines: string[] = [
    '# Bibliaris',
    '',
    `> ${en.common.siteDescription.replace(/[.!?…\s]+$/, '')}. The site is published in ${SUPPORTED_LANGS.map((l) => ENGLISH_LANGUAGE_NAMES.of(l) ?? l).join(', ')}; each book has its own set of text and audio versions, which differ by language and region.`,
    '',
    'The hubs below exist in every language under the `/<lang>/` prefix. Book, author and taxonomy pages have their own slug in each language, so do not swap the prefix to translate a link. Reading and listening do not require an account.',
    '',
  ];

  for (const lang of SUPPORTED_LANGS) {
    const dict = getDictionary(lang);
    lines.push(`## ${LANGUAGE_LABELS[lang]} (${lang})`, '');
    lines.push(`- [Bibliaris](${buildLangUrl(lang)}): ${dict.common.siteTitle}`);
    for (const hub of LLMS_HUBS) {
      if (hub.landing && !hasLanding(lang, hub.landing)) continue;
      lines.push(`- [${escapeLinkText(dict.header[hub.label])}](${buildLangUrl(lang, hub.path)})`);
    }
    lines.push('');
  }

  lines.push(
    '## Optional',
    '',
    `- [Sitemap](${buildPublicUrl('/sitemap.xml')}): every public page, split by language and type`,
    `- [robots.txt](${buildPublicUrl('/robots.txt')}): crawling rules`,
    ''
  );

  return lines.join('\n');
}
