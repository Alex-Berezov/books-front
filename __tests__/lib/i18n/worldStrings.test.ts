// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';

vi.mock('server-only', () => ({}));

const load = () => import('@/lib/i18n/worldStrings');

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('строки мира книги: пять языков (F08-3b, product.md §15)', () => {
  it('модуль открывается охраной server-only', () => {
    const root = path.resolve(__dirname, '../../../lib/i18n');
    const strings = readFileSync(path.join(root, 'worldStrings.ts'), 'utf8');
    expect(strings.startsWith("import 'server-only';")).toBe(true);
  });

  it('у каждого языка те же ключи, непустые, с теми же подстановками', async () => {
    const { worldStrings } = await load();
    const en = worldStrings.en;
    for (const lang of SUPPORTED_LANGS) {
      expect(Object.keys(worldStrings[lang]).sort()).toEqual(Object.keys(en).sort());
      for (const [key, value] of Object.entries(worldStrings[lang])) {
        expect(value.trim(), `${lang}.${key}`).not.toBe('');
        expect(placeholders(value), `${lang}.${key}`).toEqual(
          placeholders(en[key as keyof typeof en])
        );
      }
    }
  });

  it('кроме en ни один язык не повторяет английские формулы h1, title и description', async () => {
    const { worldStrings } = await load();
    for (const lang of SUPPORTED_LANGS.filter((l) => l !== 'en')) {
      expect(worldStrings[lang].worldEntityTitle).not.toBe(worldStrings.en.worldEntityTitle);
      expect(worldStrings[lang].worldIndexTitle).not.toBe(worldStrings.en.worldIndexTitle);
      expect(worldStrings[lang].worldIndexDescription).not.toBe(
        worldStrings.en.worldIndexDescription
      );
    }
  });

  it('формулы h1 героя и общей по product.md §15 (ru, en)', async () => {
    const { worldStrings } = await load();
    expect(worldStrings.ru.worldEntityTitle).toBe('{name} в книге «{title}»: характеристика героя');
    expect(worldStrings.ru.worldEntityMetaTitle).toBe(
      '{name} — характеристика героя «{title}», {author}'
    );
    expect(worldStrings.ru.worldIndexTitle).toBe('«{title}»: мир книги — герои, места и понятия');
    expect(worldStrings.en.worldEntityTitle).toBe('{name} in {title}: character analysis');
    expect(worldStrings.en.worldEntityMetaTitle).toBe(
      '{name} in {title} by {author}: character analysis'
    );
  });

  it('местные формулы запроса es, fr, pt', async () => {
    const { worldStrings } = await load();
    expect(worldStrings.es.worldEntityTitle).toMatch(/análisis del personaje/);
    expect(worldStrings.fr.worldEntityTitle).toMatch(/analyse du personnage/);
    expect(worldStrings.pt.worldEntityTitle).toMatch(/análise do personagem/);
  });

  it('описание общей страницы подставляет книгу и автора и умещается в 160 знаков', async () => {
    const { worldStrings } = await load();
    for (const lang of SUPPORTED_LANGS) {
      const text = worldStrings[lang].worldIndexDescription
        .replace('{title}', 'Oblomov')
        .replace('{author}', 'Goncharov');
      expect(text).toContain('Oblomov');
      expect(text).toContain('Goncharov');
      expect(text.length, lang).toBeLessThanOrEqual(160);
    }
  });

  it('title общей = h1 общей + « — {автор}» на всех пяти языках (§15)', async () => {
    const { worldStrings, worldIndexMetaTitle } = await load();
    for (const lang of SUPPORTED_LANGS) {
      const h1 = worldStrings[lang].worldIndexTitle.split('{title}').join('Oblomov');
      expect(worldIndexMetaTitle(lang, 'Oblomov', 'Goncharov'), lang).toBe(`${h1} — Goncharov`);
    }
  });

  it('worldNavLabel: пять языков', async () => {
    const { worldNavLabel } = await load();
    expect(Object.fromEntries(SUPPORTED_LANGS.map((l) => [l, worldNavLabel(l)]))).toEqual({
      en: 'Book world',
      es: 'Mundo del libro',
      fr: 'Univers du livre',
      pt: 'Mundo do livro',
      ru: 'Мир книги',
    });
  });
});
