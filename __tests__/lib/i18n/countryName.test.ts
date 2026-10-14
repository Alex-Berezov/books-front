// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { countryName } from '@/lib/i18n/countryName';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';

/**
 * Страна оператора и применимое право в правовых текстах (F01-6) - кодом, название даёт `Intl`.
 * Без полных данных ICU в окружении вместо названия вышел бы код: «с проживанием в AM».
 */
describe('countryName', () => {
  it('называет Армению на всех языках сайта, а не кодом', () => {
    expect(
      Object.fromEntries(SUPPORTED_LANGS.map((lang) => [lang, countryName('AM', lang)]))
    ).toEqual({
      en: 'Armenia',
      es: 'Armenia',
      fr: 'Arménie',
      pt: 'Armênia',
      ru: 'Армения',
    });
  });

  it('код, которого нет в справочнике, возвращает как есть', () => {
    expect(countryName('AA', 'ru')).toBe('AA');
  });
});
