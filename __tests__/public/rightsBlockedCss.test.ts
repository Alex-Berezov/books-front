// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildClaimClosedResponse } from '@/lib/claim-closures';

// Решение арбитра F03 | F03-4, В2: экран 451 закрытого анализа оформлен статическим
// public/rights-blocked.css, а его значения - копия styles/tokens.scss. Копия дрейфует молча:
// поменяли токен - экран остался в старом цвете. Тест держит копию и запрещает свои значения.
const root = path.resolve(__dirname, '../..');
const css = readFileSync(path.join(root, 'public/rights-blocked.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ''
);
const scss = readFileSync(path.join(root, 'styles/tokens.scss'), 'utf8').replace(/\/\/.*$/gm, '');

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();

const tokens = new Map(
  [...scss.matchAll(/^\$([a-z0-9-]+):([^;]+);/gm)].map(([, name, value]) => [
    name,
    normalize(value),
  ])
);

const rootBlock = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? '';
const copies = [...rootBlock.matchAll(/--([a-z0-9-]+):([^;]+);/g)].map(
  ([, name, value]) => [name, normalize(value)] as const
);
const rules = css.replace(/:root\s*\{[^}]*\}/, '');
const declarations = [...rules.matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/g)].map(
  ([, property, value]) => [property, normalize(value)] as const
);

describe('public/rights-blocked.css - копия токенов', () => {
  it('в :root есть копии', () => {
    expect(copies.length).toBeGreaterThan(0);
  });

  it.each(copies)('--%s совпадает с $-токеном', (name, value) => {
    expect(tokens.has(name), `нет $${name} в styles/tokens.scss`).toBe(true);
    expect(value).toBe(tokens.get(name));
  });

  it('вне :root нет своих чисел и цветов, только var() и ключевые слова', () => {
    expect(declarations.length).toBeGreaterThan(0);
    const own = declarations.filter(([, value]) => {
      const literal = value.replace(/var\(--[a-z0-9-]+\)/g, '');
      return /#|\d/.test(literal.replace(/(^|\s)0(?=\s|$)/g, ''));
    });
    expect(own).toEqual([]);
  });

  it('каждый var() ссылается на объявленную копию', () => {
    const declared = new Set(copies.map(([name]) => name));
    const used = [...rules.matchAll(/var\(--([a-z0-9-]+)\)/g)].map(([, name]) => name);
    expect(used.filter((name) => !declared.has(name))).toEqual([]);
  });

  // Разметку экрана собирает строка в lib/claim-closures.ts, стили - этот файл:
  // класс, переименованный с одной стороны, оставил бы экран без оформления при зелёных тестах.
  it('каждый класс разметки экрана 451 определён в CSS', async () => {
    const html = await buildClaimClosedResponse({
      lang: 'en',
      slug: 'hamlet',
      kind: 'analysis',
    }).text();
    const classes = [...html.matchAll(/class="([^"]+)"/g)].flatMap(([, list]) => list.split(/\s+/));
    const defined = (name: string) => new RegExp(`\\.${name}(?![\\w-])`).test(rules);
    expect(classes.length).toBeGreaterThan(0);
    expect(classes.filter((name) => !defined(name))).toEqual([]);
  });
});
