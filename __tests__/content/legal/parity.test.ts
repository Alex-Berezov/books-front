// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getLegalDocument } from '@/content/legal';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import type { LegalBlock, LegalDocument, LegalInline, LegalPageId } from '@/content/legal/types';

// Запись на каждый id: новая страница без строки здесь не соберётся, а не выпадет из сверки молча.
const PAGE_SET: Record<LegalPageId, true> = {
  privacy: true,
  terms: true,
  cookies: true,
  about: true,
  contact: true,
  'editorial-policy': true,
  'legal-notice': true,
};
const PAGES = Object.keys(PAGE_SET) as LegalPageId[];
const MIN_UNTRANSLATED_LENGTH = 40;

const inlineTexts = (inline: LegalInline[]): string[] =>
  inline.flatMap((part) =>
    part.kind === 'mailto' && part.subject ? [part.text, part.subject] : [part.text]
  );

const blockTexts = (block: LegalBlock): string[] => {
  if (block.kind === 'widget') return [];
  if (block.kind === 'table') return [...block.head, ...block.rows.flat().flatMap(inlineTexts)];
  return block.kind === 'list' ? block.items.flatMap(inlineTexts) : inlineTexts(block.content);
};

/** Вид части и её цель: ссылки и адреса обязаны совпадать во всех языках. */
const inlineShape = (part: LegalInline) =>
  part.kind === 'link'
    ? `link:${part.href}`
    : part.kind === 'external'
      ? `external:${part.href}`
      : part.kind === 'mailto'
        ? `mailto:${part.email}`
        : part.kind;

const shape = (doc: LegalDocument) =>
  doc.sections.map((section) => ({
    id: section.id,
    blocks: section.blocks.map((block) => ({
      kind: block.kind,
      parts:
        block.kind === 'widget'
          ? block.widget
          : block.kind === 'table'
            ? {
                columns: block.head.length,
                rows: block.rows.map((row) => row.map((cell) => cell.map(inlineShape))),
              }
            : block.kind === 'list'
              ? block.items.map((item) => item.map(inlineShape))
              : block.content.map(inlineShape),
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

      it(`${page}/${lang}: every table row has one cell per column`, () => {
        const tables = doc.sections.flatMap((section) =>
          section.blocks.flatMap((block) => (block.kind === 'table' ? [block] : []))
        );
        for (const table of tables) {
          expect(table.rows.map((row) => row.length)).toEqual(
            table.rows.map(() => table.head.length)
          );
        }
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
