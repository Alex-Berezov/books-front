import { describe, expect, it } from 'vitest';
import {
  applyAuthorsRobots,
  resolveAuthorsRobots,
} from '@/components/public/authors/authors-robots';
import type { AuthorsQuery } from '@/components/public/authors/authors-href';
import type { Metadata } from 'next';

const query = (over: Partial<AuthorsQuery> = {}): AuthorsQuery => ({
  page: 1,
  search: '',
  sort: 'name',
  letter: null,
  ...over,
});

const NOINDEX = { index: false, follow: true };

/**
 * Лестница решает, попадёт ли живая страница в индекс. Смена порядка веток или
 * потеря одной из них проходит typecheck и lint зелёными, а вылезает неделями
 * позже в поисковой выдаче.
 */
describe('resolveAuthorsRobots', () => {
  it('closes a search result and drops its canonical', () => {
    const decision = resolveAuthorsRobots({ query: query({ search: 'толстой' }), total: 100 });

    expect(decision.robots).toEqual(NOINDEX);
    // Canonical поиска вёл бы на чистый адрес — на другую страницу.
    expect(decision.dropAlternates).toBe(true);
  });

  it('closes an empty letter but keeps its self-canonical', () => {
    const decision = resolveAuthorsRobots({
      query: query({ letter: 'Щ' }),
      total: 0,
      letterCount: 0,
    });

    expect(decision.robots).toEqual(NOINDEX);
    expect(decision.dropAlternates).toBe(false);
  });

  it('keeps a non-empty letter indexable', () => {
    const decision = resolveAuthorsRobots({
      query: query({ letter: 'Д' }),
      total: 12,
      letterCount: 12,
    });

    expect(decision.robots).toBeUndefined();
  });

  // 🔴 Вторые и третьи страницы хаба — нормальные страницы. Поголовный noindex
  // на `?page=` выкинул бы из индекса всё, кроме первых двадцати четырёх авторов.
  it('keeps an in-range page indexable', () => {
    expect(resolveAuthorsRobots({ query: query({ page: 2 }), total: 100 }).robots).toBeUndefined();
    expect(resolveAuthorsRobots({ query: query({ page: 5 }), total: 100 }).robots).toBeUndefined();
  });

  it('closes a page past the end of the range', () => {
    expect(resolveAuthorsRobots({ query: query({ page: 99 }), total: 100 }).robots).toEqual(
      NOINDEX
    );
  });

  // 🔴 Неизвестность — не ноль. `200 + noindex` поисковик исполняет и держит
  // страницу вне индекса неделями; отсутствие тега во время сбоя не стоит ничего.
  it('emits no robots tag at all when the count could not be fetched', () => {
    const decision = resolveAuthorsRobots({ query: query({ page: 99 }), total: null });

    expect(decision.robots).toBeUndefined();
    expect(decision.dropAlternates).toBe(false);
  });

  it('passes the editorial value through when nothing else decided', () => {
    const editorial = { index: false, follow: false };
    expect(resolveAuthorsRobots({ query: query(), total: 10, editorial }).robots).toBe(editorial);
  });

  it('lets its own verdict win over the editorial one', () => {
    const decision = resolveAuthorsRobots({
      query: query({ search: 'кто-то' }),
      total: 10,
      editorial: { index: true, follow: true },
    });

    expect(decision.robots).toEqual(NOINDEX);
  });
});

describe('applyAuthorsRobots', () => {
  const meta: Metadata = {
    title: 'Авторы',
    alternates: {
      canonical: 'https://b.com/ru/authors',
      languages: { ru: 'https://b.com/ru/authors' },
    },
    openGraph: { title: 'Авторы', url: 'https://b.com/ru/authors' },
  };

  // 🔴 Страница, закрытая от индексации, не имеет права объявлять каноничной
  // версией себя какой-то другой, индексируемый адрес: сигналы противоречат.
  it('strips canonical, languages and og:url on a search page', () => {
    const result = applyAuthorsRobots(meta, { robots: NOINDEX, dropAlternates: true });

    expect(result.alternates).toBeUndefined();
    expect((result.openGraph as { url?: string }).url).toBeUndefined();
    expect(result.robots).toEqual(NOINDEX);
    expect(result.title).toBe('Авторы');
  });

  it('keeps a self-canonical when the verdict does not conflict with it', () => {
    const result = applyAuthorsRobots(meta, { robots: NOINDEX, dropAlternates: false });

    expect(result.alternates).toEqual(meta.alternates);
    expect(result.robots).toEqual(NOINDEX);
  });

  it('emits no robots key at all when there is no verdict', () => {
    const result = applyAuthorsRobots(meta, { robots: undefined, dropAlternates: false });

    expect(result.robots).toBeUndefined();
    expect(result.alternates).toEqual(meta.alternates);
  });
});
