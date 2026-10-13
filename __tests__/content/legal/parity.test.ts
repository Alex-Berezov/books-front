// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getLegalDocument } from '@/content/legal';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import type { LegalBlock, LegalDocument, LegalInline, LegalPageId } from '@/content/legal/types';

const PAGES: LegalPageId[] = ['privacy', 'terms'];
const MIN_UNTRANSLATED_LENGTH = 40;

const inlineTexts = (inline: LegalInline[]): string[] => inline.map((part) => part.text);

const blockTexts = (block: LegalBlock): string[] =>
  block.kind === 'list' ? block.items.flatMap(inlineTexts) : inlineTexts(block.content);

const shape = (doc: LegalDocument) =>
  doc.sections.map((section) => ({
    id: section.id,
    blocks: section.blocks.map((block) => ({
      kind: block.kind,
      parts:
        block.kind === 'list'
          ? block.items.map((item) => item.map((part) => part.kind))
          : block.content.map((part) => part.kind),
    })),
  }));

const texts = (doc: LegalDocument): string[] => [
  doc.metaTitle,
  doc.metaDescription,
  doc.title,
  ...doc.sections.flatMap((section) => [section.heading, ...section.blocks.flatMap(blockTexts)]),
];

describe('legal documents: language parity', () => {
  for (const page of PAGES) {
    const en = getLegalDocument(page, 'en');

    for (const lang of SUPPORTED_LANGS) {
      const doc = getLegalDocument(page, lang);

      it(`${page}/${lang} is declared for its own page and language`, () => {
        expect(doc.page).toBe(page);
        expect(doc.lang).toBe(lang);
      });

      it(`${page}/${lang} has the same sections and blocks as en`, () => {
        expect(shape(doc)).toEqual(shape(en));
        expect(doc.updatedAt).toBe(en.updatedAt);
        expect(doc.toc).toBe(en.toc);
      });

      it(`${page}/${lang} has no empty strings`, () => {
        expect(texts(doc).filter((text) => text.trim() === '')).toEqual([]);
      });

      if (lang === 'en') continue;

      it(`${page}/${lang} has no long paragraph left in English`, () => {
        const english = new Set(texts(en).filter((text) => text.length > MIN_UNTRANSLATED_LENGTH));
        expect(texts(doc).filter((text) => english.has(text))).toEqual([]);
      });
    }
  }
});
