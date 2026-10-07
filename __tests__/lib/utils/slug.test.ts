// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  SLUG_MAX_LENGTH,
  generateSlug,
  getBaseSlug,
  isKeptSlugOverLimit,
  isValidSlug,
  makeUniqueSlug,
} from '@/lib/utils/slug';

describe('Slug Utils', () => {
  describe('generateSlug', () => {
    it('should convert to lowercase', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
    });

    it('should replace spaces with hyphens', () => {
      expect(generateSlug('hello world')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(generateSlug('hello@world!')).toBe('helloworld');
    });

    it('should transliterate Cyrillic', () => {
      expect(generateSlug('Привет Мир')).toBe('privet-mir');
    });

    it('should handle multiple hyphens', () => {
      expect(generateSlug('hello---world')).toBe('hello-world');
    });

    it('should trim hyphens', () => {
      expect(generateSlug('-hello-world-')).toBe('hello-world');
    });
  });

  describe('makeUniqueSlug', () => {
    it('should return base slug if not taken', () => {
      expect(makeUniqueSlug('test', [])).toBe('test');
    });

    it('should add suffix if taken', () => {
      expect(makeUniqueSlug('test', ['test'])).toBe('test-2');
    });

    it('should increment suffix', () => {
      expect(makeUniqueSlug('test', ['test', 'test-2'])).toBe('test-3');
    });
  });

  describe('getBaseSlug', () => {
    it('should return slug as is if no suffix', () => {
      expect(getBaseSlug('test')).toBe('test');
    });

    it('should remove numeric suffix', () => {
      expect(getBaseSlug('test-2')).toBe('test');
    });
  });

  describe('isValidSlug', () => {
    it('should return true for valid slug', () => {
      expect(isValidSlug('valid-slug-123')).toBe(true);
    });

    it('should return false for uppercase', () => {
      expect(isValidSlug('Valid-Slug')).toBe(false);
    });

    it('should return false for double hyphens', () => {
      expect(isValidSlug('invalid--slug')).toBe(false);
    });

    it('should return false for starting hyphen', () => {
      expect(isValidSlug('-invalid')).toBe(false);
    });
  });

  // LEGACY-437: хранимый слаг длиннее предела на занятость не проверяется.
  describe('isKeptSlugOverLimit', () => {
    const longSlug = 'a'.repeat(SLUG_MAX_LENGTH + 1);

    it('is true only for the kept slug over the limit', () => {
      expect(isKeptSlugOverLimit(longSlug, longSlug)).toBe(true);
    });

    it('is false for a kept slug at the limit', () => {
      const atLimit = 'a'.repeat(SLUG_MAX_LENGTH);
      expect(isKeptSlugOverLimit(atLimit, atLimit)).toBe(false);
    });

    it('is false for a changed slug and on create', () => {
      expect(isKeptSlugOverLimit(`${longSlug}b`, longSlug)).toBe(false);
      expect(isKeptSlugOverLimit(longSlug)).toBe(false);
    });

    // Форма создания: ни слага, ни исходного слага ещё нет — не падает.
    it('is false when neither slug is set', () => {
      expect(isKeptSlugOverLimit(undefined, undefined)).toBe(false);
    });
  });
});
