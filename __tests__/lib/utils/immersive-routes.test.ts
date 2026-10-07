// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { isAdminImmersiveRoute, isImmersiveRoute } from '@/lib/utils/immersive-routes';

describe('isImmersiveRoute', () => {
  it('matches the reader route for every supported language', () => {
    expect(isImmersiveRoute('/en/book/war-and-peace/read')).toBe(true);
    expect(isImmersiveRoute('/ru/book/war-and-peace/read')).toBe(true);
    expect(isImmersiveRoute('/es/book/war-and-peace/read')).toBe(true);
  });

  it('ignores trailing slashes', () => {
    expect(isImmersiveRoute('/en/book/war-and-peace/read/')).toBe(true);
  });

  it('does not match the book card, the catalog or the player', () => {
    expect(isImmersiveRoute('/en/book/war-and-peace')).toBe(false);
    expect(isImmersiveRoute('/en/catalog')).toBe(false);
    expect(isImmersiveRoute('/en/book/war-and-peace/listen')).toBe(false);
    expect(isImmersiveRoute('/en/book/war-and-peace/read/extra')).toBe(false);
  });

  it('does not match unsupported languages', () => {
    expect(isImmersiveRoute('/de/book/war-and-peace/read')).toBe(false);
  });

  it('handles empty input', () => {
    expect(isImmersiveRoute('')).toBe(false);
    expect(isImmersiveRoute(null)).toBe(false);
    expect(isImmersiveRoute(undefined)).toBe(false);
  });
});

describe('isAdminImmersiveRoute', () => {
  it('matches the draft preview of a book version for every supported language', () => {
    expect(isAdminImmersiveRoute('/admin/en/books/versions/v1/preview')).toBe(true);
    expect(isAdminImmersiveRoute('/admin/ru/books/versions/v1/preview/')).toBe(true);
  });

  it('keeps the shell on every other admin page, the version editor included', () => {
    expect(isAdminImmersiveRoute('/admin/en/books/versions/v1')).toBe(false);
    expect(isAdminImmersiveRoute('/admin/en/books')).toBe(false);
    expect(isAdminImmersiveRoute('/admin/en/pages/v1/preview')).toBe(false);
    expect(isAdminImmersiveRoute('/admin/de/books/versions/v1/preview')).toBe(false);
    expect(isAdminImmersiveRoute('/en/books/versions/v1/preview')).toBe(false);
  });

  it('handles empty input', () => {
    expect(isAdminImmersiveRoute('')).toBe(false);
    expect(isAdminImmersiveRoute(null)).toBe(false);
  });
});
