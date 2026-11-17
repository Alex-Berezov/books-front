import { describe, expect, it } from 'vitest';
import { ownClusterOrNone } from '@/lib/seo/book-analysis';
import {
  buildWorldAlternates,
  describeWorld,
  isWorldEntityKey,
  pickWorldPageVersion,
  worldPageSlug,
} from '@/lib/seo/book-world';
import { buildWorldArticleJsonLd } from '@/lib/seo/world-jsonld';
import { versionHasWorld, worldEntityPath, worldPath } from '@/lib/seo/world-path';

describe('buildWorldAlternates: hreflang из поля alternates ответа', () => {
  it('общая страница: адрес каждого языка по его слагу, x-default - en', () => {
    const result = buildWorldAlternates([
      { language: 'ru', slug: 'mir-kniga' },
      { language: 'en', slug: 'world-book' },
    ]);
    expect(result).toMatchObject({
      ru: expect.stringMatching(/\/ru\/book\/mir-kniga\/wiki$/),
      en: expect.stringMatching(/\/en\/book\/world-book\/wiki$/),
      'x-default': expect.stringMatching(/\/en\/book\/world-book\/wiki$/),
    });
  });

  it('страница сущности: ключ в адресе каждого языка', () => {
    const result = buildWorldAlternates([{ language: 'en', slug: 'world-book' }], 'anna');
    expect(result?.en).toMatch(/\/en\/book\/world-book\/wiki\/anna$/);
  });

  it('x-default без en - первый язык; пустой список - кластера нет', () => {
    const result = buildWorldAlternates([
      { language: 'fr', slug: 'monde' },
      { language: 'ru', slug: 'mir' },
    ]);
    expect(result?.['x-default']).toBe(result?.fr);
    expect(buildWorldAlternates([])).toBeUndefined();
    expect(buildWorldAlternates(undefined)).toBeUndefined();
  });

  it('ownClusterOrNone: кластер без самой страницы не отдаётся', () => {
    const cluster = buildWorldAlternates([{ language: 'ru', slug: 'mir' }]);
    expect(ownClusterOrNone(cluster, 'en')).toBeUndefined();
    expect(ownClusterOrNone(cluster, 'ru')).toBe(cluster);
    expect(ownClusterOrNone(undefined, 'ru')).toBeUndefined();
  });
});

describe('выбор версии, слаг, описание, ключ', () => {
  it('версия строго языка страницы, отката на другой язык нет', () => {
    const book = {
      versions: [
        { language: 'en', id: 'e' },
        { language: 'ru', id: 'r' },
      ],
    };
    expect(pickWorldPageVersion(book as never, 'ru')?.id).toBe('r');
    expect(pickWorldPageVersion(book as never, 'fr')).toBeNull();
  });

  it('слаг адреса - то же правило, что у анализа', () => {
    expect(worldPageSlug({ slug: 'v' }, { slug: 'b', bookSlug: 'bs' }, 'r')).toBe('v');
    expect(worldPageSlug({ slug: null }, { slug: 'b', bookSlug: 'bs' }, 'r')).toBe('bs');
  });

  it('описание не длиннее 160 знаков и без лишних пробелов', () => {
    expect(describeWorld('  a   b\n c ')).toBe('a b c');
    expect(describeWorld('слово '.repeat(60))?.length).toBeLessThanOrEqual(160);
    expect(describeWorld(null)).toBeUndefined();
  });

  it('ключ сущности: ^[a-z0-9-]{1,60}$', () => {
    for (const ok of ['anna-lark', 'a', 'x1-2', 'a'.repeat(60)]) {
      expect(isWorldEntityKey(ok)).toBe(true);
    }
    for (const bad of ['', 'Anna', 'a_b', 'a b', 'a/b', 'ä', 'a'.repeat(61), '..']) {
      expect(isWorldEntityKey(bad)).toBe(false);
    }
  });
});

describe('buildWorldArticleJsonLd', () => {
  const base = {
    lang: 'en' as const,
    pageSlug: 'world-book',
    bookSchemaSlug: 'world-book',
    headline: 'H',
    editorialTeam: 'Team',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-02T00:00:00.000Z',
  };

  it('общая страница: Article, адрес /wiki, about - книга, без обложки нет image', () => {
    const ld = buildWorldArticleJsonLd(base);
    expect(ld['@type']).toBe('Article');
    expect(ld.url).toMatch(/\/en\/book\/world-book\/wiki$/);
    expect(ld.about['@id']).toMatch(/\/en\/book\/world-book#book$/);
    expect(ld.author.name).toBe('Team');
    expect('image' in ld).toBe(false);
  });

  it('сущность: адрес с ключом, обложка как image', () => {
    const ld = buildWorldArticleJsonLd({ ...base, entityKey: 'anna', coverUrl: 'https://c/x.jpg' });
    expect(ld.url).toMatch(/\/wiki\/anna$/);
    expect(ld.image).toBe('https://c/x.jpg');
  });
});

describe('world-path: адреса и признак мира версии', () => {
  it('пути общей страницы и сущности без языка', () => {
    expect(worldPath('hamlet')).toBe('/book/hamlet/wiki');
    expect(worldEntityPath('hamlet', 'ophelia')).toBe('/book/hamlet/wiki/ophelia');
  });

  it('versionHasWorld: только число больше нуля; счётчика нет - мир не подтверждён', () => {
    expect(versionHasWorld({ _count: { worldEntities: 2 } })).toBe(true);
    expect(versionHasWorld({ _count: { worldEntities: 0 } })).toBe(false);
    expect(versionHasWorld({ _count: {} })).toBe(false);
    expect(versionHasWorld({})).toBe(false);
  });
});
