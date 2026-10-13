import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONSENT_REGION_STORAGE_KEY,
  CONSENT_STORAGE_KEY,
  readCachedRegion,
  readConsentChoice,
  writeCachedRegion,
  writeConsentChoice,
} from '@/lib/consent/consent-storage';
import { CONSENT_POLICY_VERSION } from '@/lib/consent/consent-version';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-10-13T12:00:00Z');

const store = (analytics: boolean, ageDays: number, version = CONSENT_POLICY_VERSION) =>
  window.localStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({ analytics, decidedAt: new Date(NOW - ageDays * DAY).toISOString(), version })
  );

describe('readConsentChoice', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  afterEach(() => vi.restoreAllMocks());

  it('нет записи - выбора нет', () => {
    expect(readConsentChoice(NOW)).toBeNull();
  });

  it('свежее согласие действует', () => {
    store(true, 10);
    expect(readConsentChoice(NOW)?.analytics).toBe(true);
  });

  it('согласие старше 365 дней недействительно', () => {
    store(true, 366);
    expect(readConsentChoice(NOW)).toBeNull();
  });

  it('согласие с датой из будущего недействительно', () => {
    store(true, -30);
    expect(readConsentChoice(NOW)).toBeNull();
  });

  it('согласие другой версии политики недействительно', () => {
    store(true, 1, CONSENT_POLICY_VERSION + 1);
    expect(readConsentChoice(NOW)).toBeNull();
  });

  it('отказ действует и через два года, и при другой версии', () => {
    store(false, 800, CONSENT_POLICY_VERSION + 5);
    expect(readConsentChoice(NOW)?.analytics).toBe(false);
  });

  it.each([
    'not json',
    '"str"',
    'null',
    '{"analytics":"yes","decidedAt":"x","version":1}',
    '{"analytics":true}',
  ])('битая запись %s - выбора нет', (raw) => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, raw);
    expect(readConsentChoice(NOW)).toBeNull();
  });

  it('хранилище бросает исключение - выбора нет, без падения', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(readConsentChoice(NOW)).toBeNull();
    expect(readCachedRegion()).toBeNull();
  });
});

describe('регион на вкладку', () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('пишется и читается только required / not-required', () => {
    writeCachedRegion('not-required');
    expect(readCachedRegion()).toBe('not-required');
    window.sessionStorage.setItem(CONSENT_REGION_STORAGE_KEY, 'DE');
    expect(readCachedRegion()).toBeNull();
  });

  it('запись в недоступное хранилище не падает', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => writeCachedRegion('required')).not.toThrow();
  });
});

describe('writeConsentChoice', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('пишет выбор с текущей версией и временем, и он читается обратно', () => {
    const written = writeConsentChoice(true, NOW - DAY);
    expect(written).toEqual({
      analytics: true,
      decidedAt: new Date(NOW - DAY).toISOString(),
      version: CONSENT_POLICY_VERSION,
    });
    expect(readConsentChoice(NOW)).toEqual(written);
    writeConsentChoice(false, NOW);
    expect(readConsentChoice(NOW)?.analytics).toBe(false);
  });

  it('недоступное хранилище не роняет выбор: он возвращается на эту загрузку', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(writeConsentChoice(false, NOW).analytics).toBe(false);
  });
});
