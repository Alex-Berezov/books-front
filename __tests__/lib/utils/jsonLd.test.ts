import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildBreadcrumbJsonLd,
  buildItemListJsonLd,
  schemaContainsType,
  serializeJsonLd,
} from '@/lib/utils/json-ld';

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://bibliaris.com';
});

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
});

/**
 * `schemaContainsType` решает, добавлять ли на страницу второй блок разметки:
 * если нужный тип уже пришёл в редакторском бандле, свой строить не надо.
 * Ошибка в любую сторону видна только Google — отсюда проверка всех четырёх
 * форм, в которых `@type` встречается в реальных ответах.
 */
describe('schemaContainsType', () => {
  it('находит тип, записанный строкой', () => {
    expect(schemaContainsType({ '@type': 'BreadcrumbList' }, 'BreadcrumbList')).toBe(true);
  });

  it('находит тип внутри массива типов', () => {
    expect(schemaContainsType({ '@type': ['WebPage', 'ItemList'] }, 'ItemList')).toBe(true);
  });

  it('находит тип внутри `@graph`', () => {
    const schema = { '@graph': [{ '@type': 'Organization' }, { '@type': 'BreadcrumbList' }] };

    expect(schemaContainsType(schema, 'BreadcrumbList')).toBe(true);
  });

  it('возвращает false, когда типа нет ни на верхнем уровне, ни в графе', () => {
    expect(schemaContainsType({ '@graph': [{ '@type': 'Organization' }] }, 'ItemList')).toBe(false);
  });

  // Бандл приходит из API и может быть пустым или испорченным: это не повод
  // уронить страницу.
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['строка', 'BreadcrumbList'],
    ['число', 42],
  ])('не падает на значении %s', (_name, value) => {
    expect(schemaContainsType(value, 'BreadcrumbList')).toBe(false);
  });
});

describe('buildBreadcrumbJsonLd', () => {
  const items = [
    { name: 'Home', url: 'https://bibliaris.com/en' },
    { name: 'Catalog', url: 'https://bibliaris.com/en/catalog' },
  ];

  it('нумерует позиции с единицы и сохраняет порядок', () => {
    const schema = buildBreadcrumbJsonLd(items);
    const list = schema.itemListElement as Array<Record<string, unknown>>;

    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ position: 1, name: 'Home', item: 'https://bibliaris.com/en' });
    expect(list[1]).toMatchObject({ position: 2, name: 'Catalog' });
  });

  it('привязывает `@id` к адресу страницы, когда он передан', () => {
    const schema = buildBreadcrumbJsonLd(items, 'https://bibliaris.com/en/catalog');

    expect(schema['@id']).toBe('https://bibliaris.com/en/catalog#breadcrumb');
  });

  // Без адреса страницы якорь обязан остаться на сайте, а не превратиться в
  // `undefined#breadcrumb`.
  it('без адреса страницы падает на корень сайта', () => {
    const schema = buildBreadcrumbJsonLd(items);

    expect(schema['@id']).toBe('https://bibliaris.com/#breadcrumb');
  });

  it('пустой список даёт пустой `itemListElement`, а не отсутствующий', () => {
    const schema = buildBreadcrumbJsonLd([]);

    expect(schema.itemListElement).toEqual([]);
  });
});

describe('buildItemListJsonLd', () => {
  it('отдаёт null на пустом списке — блок разметки не должен появиться', () => {
    expect(buildItemListJsonLd([])).toBeNull();
  });

  /**
   * Элемент без имени или без адреса — это не «почти элемент», а мусор:
   * ItemList с пустым `url` Google трактует как ошибку разметки.
   */
  it('отбрасывает элементы без имени или без адреса', () => {
    const schema = buildItemListJsonLd([
      { name: 'Valid', url: 'https://bibliaris.com/en/book/a' },
      { name: '', url: 'https://bibliaris.com/en/book/b' },
      { name: 'No url', url: '' },
    ]);

    const list = schema?.itemListElement as Array<Record<string, unknown>>;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ position: 1, name: 'Valid' });
  });

  it('отдаёт null, когда после отбраковки не осталось ни одного элемента', () => {
    expect(buildItemListJsonLd([{ name: '', url: '' }])).toBeNull();
  });

  it('привязывает `@id` к адресу страницы, а без него — к корню сайта', () => {
    const items = [{ name: 'A', url: 'https://bibliaris.com/en/book/a' }];

    expect(buildItemListJsonLd(items, 'https://bibliaris.com/en/catalog')?.['@id']).toBe(
      'https://bibliaris.com/en/catalog#itemlist'
    );
    expect(buildItemListJsonLd(items)?.['@id']).toBe('https://bibliaris.com/#itemlist');
  });
});

describe('serializeJsonLd', () => {
  const LS = String.fromCharCode(0x2028);
  const PS = String.fromCharCode(0x2029);
  const BACKSLASH = String.fromCharCode(0x5c);
  const HOSTILE = `</script><img src=x onerror=alert(1)> & ${LS}${PS}`;

  it('does not let admin text close the script block', () => {
    const out = serializeJsonLd({ text: HOSTILE });
    expect(out).not.toMatch(/[<>&]/);
    expect(out).not.toContain(LS);
    expect(out).not.toContain(PS);
    expect(out).toContain(`${BACKSLASH}u003c/script${BACKSLASH}u003e`);
  });

  it('renders an empty block instead of throwing when there is nothing to serialize', () => {
    expect(serializeJsonLd(undefined)).toBe('');
  });

  it('stays valid JSON that parses back to the original value', () => {
    const value = { '@type': 'FAQPage', mainEntity: [{ name: HOSTILE }] };
    expect(JSON.parse(serializeJsonLd(value))).toEqual(value);
  });
});
