// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/consent-region/route';

const call = async (country?: string) => {
  const headers = new Headers();
  if (country !== undefined) headers.set('cf-ipcountry', country);
  const response = GET(new Request('https://bibliaris.com/api/consent-region', { headers }));
  return { response, body: await response.json() };
};

describe('GET /api/consent-region', () => {
  it.each([
    ['DE', true],
    ['GB', true],
    ['US', false],
    ['RU', false],
    ['XX', true],
    ['T1', true],
  ])('%s -> consentRequired %s', async (country, expected) => {
    expect((await call(country)).body).toEqual({ consentRequired: expected });
  });

  it('без заголовка страны плашка нужна', async () => {
    expect((await call()).body).toEqual({ consentRequired: true });
  });

  it('ответ личный и без кук; страны в теле нет', async () => {
    const { response, body } = await call('FR');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(Object.keys(body)).toEqual(['consentRequired']);
  });
});
