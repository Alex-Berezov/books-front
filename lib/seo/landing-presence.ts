import { getBookCards } from '@/api/endpoints/public';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import { toCountResult, type CountResult } from '@/lib/utils/seo-indexing';

/** Count-gated landings: `/audiobooks`, `/popular-books`, `/new-releases`. */
export type LandingKey = 'audiobooks' | 'popular' | 'new';

export type HasLanding = (lang: string, key: LandingKey) => boolean;

/**
 * Which count-gated landings have books, per language. Shared by the sitemap and `/llms.txt`
 * so a link, the sitemap and the page's own `noindex` decide alike (`ai-context/seo-rules.md`).
 *
 * A landing is dropped only when it is *known* to be empty. `.catch(() => null)` collapsed into
 * `?? 0` used to silently un-list all three landings in every language whenever the API blinked
 * during a crawl. Unknown counts as "keep": dropping a live URL costs more than listing an empty one.
 */
export async function loadLandingPresence(consumer: string): Promise<HasLanding> {
  const landingCounts = new Map<
    string,
    { audiobooks: CountResult; popular: CountResult; new: CountResult }
  >();
  await Promise.all(
    SUPPORTED_LANGS.map(async (lang) => {
      const count = async (params: Parameters<typeof getBookCards>[3]) => {
        try {
          const res = await getBookCards(lang as SupportedLang, 1, 1, params);
          return toCountResult(res?.pagination?.total ?? null);
        } catch (error) {
          console.error(`Error counting landing books for ${consumer} (${lang}):`, error);
          return toCountResult(null);
        }
      };
      const [audiobooks, popular, newest] = await Promise.all([
        count({ type: 'audio' }),
        count({ sort: 'popular' }),
        count({ sort: 'new' }),
      ]);
      landingCounts.set(lang, { audiobooks, popular, new: newest });
    })
  );

  return (lang, key) => {
    const count = landingCounts.get(lang)?.[key];
    if (!count || !count.ok) return true;
    return count.total > 0;
  };
}
