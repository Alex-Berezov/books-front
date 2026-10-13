// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CONSENT_COUNTRIES, isConsentRequired } from '@/lib/consent/consent-countries';

describe('CONSENT_COUNTRIES', () => {
  it('ровно 39 кодов, без повторов, все похожи на ISO-2', () => {
    expect(CONSENT_COUNTRIES).toHaveLength(39);
    expect(new Set(CONSENT_COUNTRIES).size).toBe(39);
    for (const code of CONSENT_COUNTRIES) expect(code).toMatch(/^[A-Z]{2}$/);
  });

  it('коды Cloudflare: Греция GR, Великобритания GB', () => {
    expect(CONSENT_COUNTRIES).toContain('GR');
    expect(CONSENT_COUNTRIES).toContain('GB');
    expect(CONSENT_COUNTRIES).not.toContain('EL');
    expect(CONSENT_COUNTRIES).not.toContain('UK');
  });
});

describe('особые территории ЕС (решение арбитра F01-2)', () => {
  it.each(['GF', 'GP', 'MQ', 'RE', 'YT', 'MF', 'AX'])('%s входит в список', (code) => {
    expect(isConsentRequired(code)).toBe(true);
  });

  it.each(['BL', 'PM', 'NC'])('%s - территория вне ЕС, плашки нет', (code) => {
    expect(isConsentRequired(code)).toBe(false);
  });
});

describe('isConsentRequired', () => {
  it.each([
    'DE',
    'de',
    ' gb ',
    'CH',
    'NO',
    'GR',
    '',
    null,
    undefined,
    'XX',
    'xx',
    'T1',
    'ZZZ',
    'D',
    '1A',
  ])('плашка нужна для %j', (country) => {
    expect(isConsentRequired(country)).toBe(true);
  });

  it.each(['US', 'BR', 'RU', 'IN', 'CA', 'us'])('плашка не нужна для %s', (country) => {
    expect(isConsentRequired(country)).toBe(false);
  });
});
