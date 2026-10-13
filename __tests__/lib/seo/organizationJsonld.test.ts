// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from '@/lib/seo/organization-jsonld';
import { contactGeneral } from '@/lib/site/owner-facts';
import { schemaContainsType } from '@/lib/utils/json-ld';

/**
 * Разметка организации и сайта (`F01-4`, `product.md` §9): имя, абсолютные адреса, почта из фактов
 * владельца; без `sameAs` (ссылок владелец не дал). Узел сайта совпадает с `WebSite` бэкенда
 * (`books/src/modules/seo/schema/generateWebSiteSchema.ts`): один `@id`, корень, поиск каталога.
 */
describe('Organization и WebSite', () => {
  it('Organization: имя, абсолютные адреса, почта; пустых полей и sameAs нет', () => {
    const org = buildOrganizationJsonLd();
    expect(org['@context']).toBe('https://schema.org');
    expect(org['@type']).toBe('Organization');
    expect(org['@id']).toMatch(/^https?:\/\/[^/]+\/#organization$/);
    expect(org.name).toBe('Bibliaris');
    expect(org.url).toMatch(/^https?:\/\/[^/]+\/$/);
    expect(org.logo).toMatch(/^https?:\/\/[^/]+\/favicon\.png$/);
    expect(org.email).toBe(contactGeneral);
    expect(Object.values(org).filter((value) => value === '' || value == null)).toEqual([]);
    expect(org).not.toHaveProperty('sameAs');
    expect(schemaContainsType(org, 'Organization')).toBe(true);
  });

  it.each(['en', 'es', 'fr', 'pt', 'ru'])(
    'WebSite %s: узел бэкенда, поиск каталога на языке страницы',
    (lang) => {
      const site = buildWebSiteJsonLd(lang);
      expect(site['@type']).toBe('WebSite');
      // Узел один на все языки (тот же `@id` у бэкенда), поэтому языка у него нет.
      expect(site).not.toHaveProperty('inLanguage');
      expect(site.url).toMatch(/^https?:\/\/[^/]+\/$/);
      expect(site['@id']).toBe(`${site.url}#website`);
      expect(site.publisher).toEqual({ '@id': buildOrganizationJsonLd()['@id'] });
      expect(site.potentialAction.target.urlTemplate).toBe(
        `${site.url}${lang}/catalog?q={search_term_string}`
      );
      expect(site.potentialAction['query-input']).toBe('required name=search_term_string');
      expect(schemaContainsType(site, 'WebSite')).toBe(true);
    }
  );
});
