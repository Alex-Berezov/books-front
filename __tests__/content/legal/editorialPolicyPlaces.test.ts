// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getLegalDocument } from '@/content/legal';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import type { LegalBlock } from '@/content/legal/types';

/**
 * F08-12c (`product.md` §12, решение арбитра `F08 | F08-12c` Q5): с выходом страниц мест раздел
 * `world` редполитики называет места в первых двух тезисах - кто готовит страницы и по каким главам
 * пишет модель - и в тезисе о главах, которые считает программа. Wikidata и иллюстрации мест здесь
 * не упоминаются: точка видна с `F08-12d`, картинка места - с `F08-12c-2`.
 */
const paragraphText = (block: LegalBlock): string =>
  block.kind === 'paragraph' ? block.content.map((part) => part.text).join('') : '';

const PLACES: Record<(typeof SUPPORTED_LANGS)[number], RegExp[]> = {
  en: [
    /about characters and places/,
    /where the character or place appears/,
    /a place is mentioned/,
  ],
  es: [/sobre los personajes y los lugares/, /el personaje o el lugar/, /se menciona un lugar/],
  fr: [/aux personnages et aux lieux/, /le personnage ou le lieu/, /un personnage ou un lieu/],
  pt: [/sobre os personagens e os lugares/, /o personagem ou o lugar/, /um lugar é mencionado/],
  ru: [/о героях и местах/, /герой или место/, /упоминается место/],
};

describe('editorial policy: places in the world section', () => {
  it.each(SUPPORTED_LANGS)(
    '%s: places named in the first two theses and in the counted chapters',
    (lang) => {
      const world = getLegalDocument('editorial-policy', lang).sections.find(
        (s) => s.id === 'world'
      );
      const paragraphs = (world?.blocks ?? []).map(paragraphText);
      const [preparedBy, written, quotes] = PLACES[lang];
      expect(paragraphs[0]).toMatch(preparedBy);
      expect(paragraphs[1]).toMatch(written);
      expect(paragraphs[2]).toMatch(quotes);
      expect(paragraphs.join(' ')).not.toMatch(/Wikidata/);
    }
  );
});
