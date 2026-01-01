import { describe, it, expect } from 'vitest';
import { isSupportedLang, switchLangInPath } from '@/lib/i18n/lang';

describe('i18n Utils', () => {
  describe('isSupportedLang', () => {
    it('should return true for supported languages', () => {
      expect(isSupportedLang('en')).toBe(true);
      expect(isSupportedLang('es')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(isSupportedLang('de')).toBe(false);
      expect(isSupportedLang('ru')).toBe(false);
    });
  });

  describe('switchLangInPath', () => {
    it('should switch language in public path', () => {
      expect(switchLangInPath('/en/books', 'es')).toBe('/es/books');
    });

    it('should switch language in admin path', () => {
      expect(switchLangInPath('/admin/en/dashboard', 'fr')).toBe('/admin/fr/dashboard');
    });

    it('should handle root path', () => {
      expect(switchLangInPath('/en', 'pt')).toBe('/pt');
    });
  });
});
