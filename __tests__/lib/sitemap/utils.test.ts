import { describe, it, expect, vi, beforeEach } from 'vitest';
import { escapeXml, getBaseUrl, buildUrl } from '@/lib/sitemap/utils';

beforeEach(() => {
  vi.resetModules();
});

describe('escapeXml', () => {
  it('should escape ampersands', () => {
    expect(escapeXml('a&b')).toBe('a&amp;b');
  });

  it('should escape less-than', () => {
    expect(escapeXml('a<b')).toBe('a&lt;b');
  });

  it('should escape greater-than', () => {
    expect(escapeXml('a>b')).toBe('a&gt;b');
  });

  it('should escape double quotes', () => {
    expect(escapeXml('a"b')).toBe('a&quot;b');
  });

  it('should escape single quotes', () => {
    expect(escapeXml("a'b")).toBe('a&apos;b');
  });

  it('should escape all special chars together', () => {
    expect(escapeXml('<a href="x&\'y">')).toBe('&lt;a href=&quot;x&amp;&apos;y&quot;&gt;');
  });

  it('should return empty string for empty input', () => {
    expect(escapeXml('')).toBe('');
  });

  it('should pass through safe strings unchanged', () => {
    expect(escapeXml('hello-world')).toBe('hello-world');
    expect(escapeXml('/en/catalog')).toBe('/en/catalog');
    expect(escapeXml('https://bibliaris.com/en/book/slug')).toBe(
      'https://bibliaris.com/en/book/slug'
    );
  });
});

describe('getBaseUrl', () => {
  it('should return NEXT_PUBLIC_SITE_URL when set', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://bibliaris.com';
    expect(getBaseUrl()).toBe('https://bibliaris.com');
  });

  it('should strip trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://bibliaris.com/';
    expect(getBaseUrl()).toBe('https://bibliaris.com');
  });

  it('should fallback to https://bibliaris.com when env not set', () => {
    process.env.NEXT_PUBLIC_SITE_URL = '';
    expect(getBaseUrl()).toBe('https://bibliaris.com');
  });
});

describe('buildUrl', () => {
  it('should build a full URL from path', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://bibliaris.com';
    expect(buildUrl('/en/catalog')).toBe('https://bibliaris.com/en/catalog');
  });
});
