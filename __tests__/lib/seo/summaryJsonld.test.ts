import { describe, expect, it } from 'vitest';
import { buildOrganizationJsonLd } from '@/lib/seo/organization-jsonld';
import { buildSummaryArticleJsonLd, buildSummarySectionJsonLd } from '@/lib/seo/summary-jsonld';
import { buildLangUrl } from '@/lib/seo/urls';

/**
 * Разметка пересказа (`F01-5`, `product.md` §9, решение арбитра `F01 | F01-5`): автор - «Редакция
 * Bibliaris» со ссылкой на редполитику, связанная с общей организацией, дата изменения пересказа.
 */
describe('buildSummaryArticleJsonLd', () => {
  const ld = buildSummaryArticleJsonLd({
    lang: 'ru',
    bookSlug: 'crime',
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
    expect(ld.url).toBe(buildLangUrl('ru', '/book/crime/summary'));
    expect(ld.about).toEqual({ '@type': 'Book', name: 'Преступление и наказание' });
    expect(ld.headline).toBe('Преступление и наказание — пересказ');
  });
});

// F04-3 (`product.md` §6 п.3): раздел - та же статья редакции, свой адрес и дата, `isPartOf` на пересказ.
describe('buildSummarySectionJsonLd', () => {
  const ld = buildSummarySectionJsonLd({
    lang: 'ru',
    bookSlug: 'oblomov',
    number: 2,
    bookTitle: 'Обломов',
    headline: 'Обломов: Часть вторая — краткое содержание',
    editorialTeam: 'Редакция Bibliaris',
    contentDate: '2026-10-15T08:00:00.000Z',
  });

  it('свой адрес, дата раздела и isPartOf на страницу пересказа', () => {
    expect(ld.url).toBe(buildLangUrl('ru', '/book/oblomov/summary/2'));
    expect(ld.dateModified).toBe('2026-10-15T08:00:00.000Z');
    expect(ld.isPartOf).toEqual({
      '@type': 'Article',
      url: buildLangUrl('ru', '/book/oblomov/summary'),
    });
  });

  it('поля статьи редакции - те же, что у пересказа', () => {
    expect(ld['@type']).toBe('Article');
    expect(ld.inLanguage).toBe('ru');
    expect(ld.headline).toBe('Обломов: Часть вторая — краткое содержание');
    expect(ld.about).toEqual({ '@type': 'Book', name: 'Обломов' });
    expect(ld.author).toEqual({
      '@type': 'Organization',
      name: 'Редакция Bibliaris',
      url: buildLangUrl('ru', '/editorial-policy'),
      parentOrganization: { '@id': buildOrganizationJsonLd()['@id'] },
    });
  });
});
