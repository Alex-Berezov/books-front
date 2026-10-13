import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearGaCookies } from '@/lib/consent/ga-cookies';

/**
 * jsdom живёт на `localhost`, где родительского домена нет, поэтому ветку
 * `domain=.bibliaris.com` видно только через подмену `document.cookie`.
 */
function spyCookies(current: string) {
  const writes: string[] = [];
  vi.spyOn(document, 'cookie', 'get').mockReturnValue(current);
  vi.spyOn(document, 'cookie', 'set').mockImplementation((value: string) => {
    writes.push(value);
  });
  return writes;
}

describe('clearGaCookies', () => {
  afterEach(() => vi.restoreAllMocks());

  it('на www.bibliaris.com стирает _ga и _ga_* и на хосте, и на .bibliaris.com', () => {
    const writes = spyCookies('_ga=GA1.1.1; keep=1; _ga_ABC=GS1.1.1');
    clearGaCookies('www.bibliaris.com');
    expect(writes).toEqual([
      '_ga=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/',
      '_ga=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.bibliaris.com',
      '_ga_ABC=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/',
      '_ga_ABC=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.bibliaris.com',
    ]);
  });

  it('на bibliaris.com родитель - сам домен', () => {
    const writes = spyCookies('_ga=1');
    clearGaCookies('bibliaris.com');
    expect(writes).toContain(
      '_ga=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.bibliaris.com'
    );
  });

  it.each(['localhost', '127.0.0.1'])('на %s пишет только на хост', (hostname) => {
    const writes = spyCookies('_ga=1');
    clearGaCookies(hostname);
    expect(writes).toEqual(['_ga=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/']);
  });

  it('чужие cookie, в том числе похожие по имени, не трогает', () => {
    const writes = spyCookies('keep=1; ga=2; my_ga=3; _gax=4');
    clearGaCookies('www.bibliaris.com');
    expect(writes).toEqual([]);
  });
});
