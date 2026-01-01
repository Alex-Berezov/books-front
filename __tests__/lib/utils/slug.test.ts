import { describe, it, expect } from 'vitest';
import { generateSlug, makeUniqueSlug, getBaseSlug, isValidSlug } from '@/lib/utils/slug';

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
});
