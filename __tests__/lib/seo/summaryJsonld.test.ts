import { describe, expect, it } from 'vitest';
import { buildOrganizationJsonLd } from '@/lib/seo/organization-jsonld';
import { buildSummaryArticleJsonLd } from '@/lib/seo/summary-jsonld';
import { buildLangUrl } from '@/lib/seo/urls';

/**
 * Разметка пересказа (`F01-5`, `product.md` §9, решение арбитра `F01 | F01-5`): автор - «Редакция
 * Bibliaris» со ссылкой на редполитику, связанная с общей организацией, дата изменения пересказа.
 */
describe('buildSummaryArticleJsonLd', () => {
  const ld = buildSummaryArticleJsonLd({
    lang: 'ru',
    bookSlug: 'crime',
    versionId: 'v-1',
    bookTitle: 'Преступление и наказание',
    headline: 'Преступление и наказание — пересказ',
    editorialTeam: 'Редакция Bibliaris',
    updatedAt: '2026-10-12T10:00:00.000Z',
  });

  it('автор - редакция со ссылкой на /editorial-policy и parentOrganization на общий @id', () => {
    expect(ld.author).toEqual({
      '@type': 'Organization',
      name: 'Редакция Bibliaris',
      url: buildLangUrl('ru', '/editorial-policy'),
      parentOrganization: { '@id': buildOrganizationJsonLd()['@id'] },
    });
    // Своего `@id` у автора нет: иначе общий узел организации получил бы второй `url`.
    expect(ld.author).not.toHaveProperty('@id');
  });

  it('статья: dateModified из updatedAt, язык, адрес и книга в about', () => {
    expect(ld['@type']).toBe('Article');
    expect(ld.dateModified).toBe('2026-10-12T10:00:00.000Z');
    expect(ld.inLanguage).toBe('ru');
    expect(ld.url).toBe(buildLangUrl('ru', '/summary/crime/v-1'));
    expect(ld.about).toEqual({ '@type': 'Book', name: 'Преступление и наказание' });
    expect(ld.headline).toBe('Преступление и наказание — пересказ');
  });
});
