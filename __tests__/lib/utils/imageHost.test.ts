import { describe, expect, it } from 'vitest';
import { isOptimizableHost } from '@/lib/utils/image-host';

/**
 * Предикат решает, пойдёт ли картинка через оптимизатор Next. На неразрешённом
 * хосте оптимизатор отвечает 400, а большая часть мест рендера серверные и
 * `onError` в них не поставить — то есть картинка просто не появится.
 */
describe('isOptimizableHost', () => {
  it('accepts exactly the two static hosts of remotePatterns', () => {
    expect(isOptimizableHost('https://media.bibliaris.com/a.jpg')).toBe(true);
    expect(isOptimizableHost('https://api.bibliaris.com/a.jpg')).toBe(true);
  });

  it('rejects hosts the optimizer is not configured for', () => {
    // Викисклад — `.org`, и в `remotePatterns` его нет: такое фото рендерится
    // как есть, а не подменяется заглушкой.
    expect(isOptimizableHost('https://upload.wikimedia.org/a.jpg')).toBe(false);
    expect(isOptimizableHost('https://example.net/a.jpg')).toBe(false);
  });

  /**
   * 🔴 LEGACY-137. До 26.08.2026 предикат гласил `hostname.endsWith('.com')` — копию
   * шаблона `**.com` из `next.config.js`. Шаблон снят как открытый прокси;
   * возврат любой из двух форм роняет эту проверку.
   */
  it('does not accept a whole top-level zone', () => {
    expect(isOptimizableHost('https://example.com/a.jpg')).toBe(false);
    expect(isOptimizableHost('https://evil.com/a.jpg')).toBe(false);
    expect(isOptimizableHost('https://bibliaris.com.attacker.com/a.jpg')).toBe(false);
  });

  it('accepts http only on localhost', () => {
    expect(isOptimizableHost('http://localhost:3000/a.jpg')).toBe(true);
    expect(isOptimizableHost('http://media.bibliaris.com/a.jpg')).toBe(false);
  });

  it('treats a site-relative path as our own domain', () => {
    expect(isOptimizableHost('/uploads/a.jpg')).toBe(true);
  });

  it('rejects a string that is not a URL at all', () => {
    expect(isOptimizableHost('not a url')).toBe(false);
    expect(isOptimizableHost('')).toBe(false);
  });

  /**
   * 🔴 Протокол-относительный адрес роняет `new URL` и попадает в ту же ветку `catch`,
   * что и свой относительный путь, но своим доменом не является. Оптимизатор Next
   * отвергает его отдельной проверкой — 400 и пустое место вместо картинки, а места
   * рендера в большинстве серверные, `onError` в них не поставить.
   */
  it('does not mistake a protocol-relative URL for our own domain', () => {
    expect(isOptimizableHost('//upload.wikimedia.org/a.jpg')).toBe(false);
    expect(isOptimizableHost('//attacker.example/a.jpg')).toBe(false);
    expect(isOptimizableHost('//media.bibliaris.com/a.jpg')).toBe(false);
  });

  it('does not throw when the field arrives null past the hand-written type', () => {
    // Места рендера серверные: брошенное отсюда уронило бы страницу целиком.
    expect(isOptimizableHost(null as unknown as string)).toBe(false);
    expect(isOptimizableHost(undefined as unknown as string)).toBe(false);
  });

  /**
   * `data:` и `blob:` через `new URL` разбираются без отказа, поэтому веткой
   * `catch` они не отсекаются: их отсекает проверка схемы. Оптимизатор такой
   * адрес не принимает, и `unoptimized` для них — единственный рабочий ответ.
   */
  it('rejects data: and blob: sources', () => {
    expect(isOptimizableHost('data:image/png;base64,iVBORw0KGgo=')).toBe(false);
    expect(isOptimizableHost('blob:https://bibliaris.com/8a7b')).toBe(false);
  });
});
