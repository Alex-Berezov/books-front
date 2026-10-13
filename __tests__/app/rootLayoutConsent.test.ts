// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `F01-2`. `GoogleAnalytics` зовёт `useConsent()`, а тот вне `ConsentProvider` бросает: обёртка
 * в корневом layout держит всю выдачу. Тест провайдера собирает дерево сам и её не видит.
 */
describe('app/layout.tsx: согласие на cookie', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../app/layout.tsx'), 'utf8');

  it('GoogleAnalytics и AppProviders стоят внутри ConsentProvider', () => {
    const open = source.indexOf('<ConsentProvider>');
    const close = source.indexOf('</ConsentProvider>');
    expect(open).toBeGreaterThan(-1);
    for (const child of ['<GoogleAnalytics', '<AppProviders>']) {
      const at = source.indexOf(child);
      expect(at, child).toBeGreaterThan(open);
      expect(at, child).toBeLessThan(close);
    }
  });

  it('корневой layout не читает headers() и cookies(): страницы остаются статичными', () => {
    expect(source).not.toMatch(/\b(headers|cookies)\(\)/);
    expect(source).not.toMatch(/from 'next\/headers'/);
  });
});
