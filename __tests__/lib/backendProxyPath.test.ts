// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { backendPathFrom, isProxyRefusal, upstreamUrlFor } from '@/lib/backend-proxy';

/**
 * LEGACY-465. Путь прокси — граница, за которой стоит токен пользователя: путь, уведший
 * запрос с API, унёс бы токен на чужой хост. Разбор проверяется на сырых строках, а не через
 * `URL`: тот нормализует `..` и `//` сам, и тест через него проверял бы нормализацию,
 * а не прокси.
 */

describe('backendPathFrom', () => {
  it('keeps the raw API path with its encoding', () => {
    expect(backendPathFrom('/api/backend/users/me')).toBe('/users/me');
    expect(backendPathFrom('/api/backend/books/a%20b/x')).toBe('/books/a%20b/x');
  });

  it.each([
    '/api/backend',
    '/api/backend/',
    '/api/backendx/users',
    '/api/backend/../admin',
    '/api/backend/%2e%2E/admin',
    '/api/backend/users//x',
    '/api/backend/users/%2F%2Fevil.example',
    '/api/backend/users/%5Cevil',
    '/api/backend/users/%00',
    '/api/backend/users/%E0%A4%A',
  ])('refuses %s', (pathname) => {
    const result = backendPathFrom(pathname);
    expect(isProxyRefusal(result) && result.status).toBe(400);
  });

  it('refuses the auth routes with 403', () => {
    const result = backendPathFrom('/api/backend/auth/login');
    expect(isProxyRefusal(result) && result.status).toBe(403);
  });
});

describe('upstreamUrlFor', () => {
  it('joins the API base, the path and the query', () => {
    const url = upstreamUrlFor('https://api.example.com/api', '/users/me', '?a=1');
    expect(String(url)).toBe('https://api.example.com/api/users/me?a=1');
  });

  it('tolerates a trailing slash in the base', () => {
    const url = upstreamUrlFor('https://api.example.com/api/', '/users/me', '');
    expect(String(url)).toBe('https://api.example.com/api/users/me');
  });

  it('refuses a path that would leave the API base after URL normalization', () => {
    const result = upstreamUrlFor('https://api.example.com/api', '/../admin', '');
    expect(isProxyRefusal(result) && result.status).toBe(400);
  });
});
