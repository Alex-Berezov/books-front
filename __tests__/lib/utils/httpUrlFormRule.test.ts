// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { httpUrlFormRule, httpUrlListFormRule, splitUrlList } from '@/lib/utils/http-url-form-rule';

/**
 * `LEGACY-447`: ручки претензии, вложения и лицензии отбивают ссылку не `http(s)` 400.
 * Форма называет поле до запроса — правило то же, что у бэкенда.
 */
describe('httpUrlFormRule (LEGACY-447)', () => {
  it.each(['example.org/a', 'javascript:alert(1)', 'ftp://example.org/a'])(
    'отбивает %j',
    async (value) => {
      await expect(httpUrlFormRule.validator(null, value)).rejects.toThrow();
    }
  );

  it.each([undefined, '', '   ', 'https://example.org/a', ' https://example.org/a '])(
    'пропускает %j',
    async (value) => {
      await expect(httpUrlFormRule.validator(null, value)).resolves.toBeUndefined();
    }
  );
});

describe('httpUrlListFormRule (LEGACY-447)', () => {
  it('называет первую негодную ссылку списка', async () => {
    await expect(
      httpUrlListFormRule.validator(null, 'https://example.org/a\nexample.com/b')
    ).rejects.toThrow('example.com/b');
  });

  it('пропускает список абсолютных ссылок и пустое поле', async () => {
    await expect(
      httpUrlListFormRule.validator(null, 'https://example.org/a, http://example.com/b')
    ).resolves.toBeUndefined();
    await expect(httpUrlListFormRule.validator(null, '')).resolves.toBeUndefined();
  });
});

describe('splitUrlList (LEGACY-447)', () => {
  // Запятая законна внутри адреса: разбор по ней резал ссылку на куски (ревью T118).
  it('не режет ссылку по запятой и делит по строкам и пробелам', () => {
    expect(
      splitUrlList('https://ru.wikipedia.org/wiki/Уайльд,_Оскар\n https://example.org/a')
    ).toEqual(['https://ru.wikipedia.org/wiki/Уайльд,_Оскар', 'https://example.org/a']);
  });

  it('пустое поле — отсутствующее', () => {
    expect(splitUrlList('  ')).toBeUndefined();
    expect(splitUrlList(undefined)).toBeUndefined();
  });
});
