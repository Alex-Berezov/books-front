// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getLegalDocument } from '@/content/legal';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import type { LegalBlock } from '@/content/legal/types';

/**
 * F08-13c (`product.md` §12): с выходом страниц предметов, понятий и событий раздел `world`
 * редполитики называет их в тезисе о том, кто готовит страницы (и глоссарий всех понятий), и в
 * тезисе о главах, которые считает программа (у события - и главы его сцен).
 */
const paragraphText = (block: LegalBlock): string =>
  block.kind === 'paragraph' ? block.content.map((part) => part.text).join('') : '';

const OBJECTS: Record<(typeof SUPPORTED_LANGS)[number], [RegExp, RegExp]> = {
  en: [
    /objects, terms and events of the book; all terms are listed in the glossary/,
    /an event also gets the chapters of the scenes described on its page/,
  ],
  es: [
    /objetos, conceptos y acontecimientos del libro; todos los conceptos figuran en el glosario/,
    /a un acontecimiento se suman además los capítulos de las escenas descritas en su página/,
  ],
  fr: [
    /objets, aux notions et aux événements du livre ; toutes les notions figurent dans le glossaire/,
    /un événement reçoit en outre les chapitres des scènes décrites sur sa page/,
  ],
  pt: [
    /objetos, conceitos e acontecimentos do livro; todos os conceitos aparecem no glossário/,
    /a um acontecimento somam-se ainda os capítulos das cenas descritas na sua página/,
  ],
  ru: [
    /предметах, понятиях и событиях книги; все понятия собраны в глоссарии/,
    /к главам события добавляются главы сцен, описанных на его странице/,
  ],
};

describe('editorial policy: objects, terms and events in the world section', () => {
  it.each(SUPPORTED_LANGS)('%s: named in the first thesis and in the counted chapters', (lang) => {
    const world = getLegalDocument('editorial-policy', lang).sections.find((s) => s.id === 'world');
    const paragraphs = (world?.blocks ?? []).map(paragraphText);
    const [preparedBy, chapters] = OBJECTS[lang];
    // Абзац ищется по фразе, а не по номеру: вставка абзаца выше не сдвинет проверку.
    expect(paragraphs.filter((p) => preparedBy.test(p))).toHaveLength(1);
    expect(paragraphs.filter((p) => chapters.test(p))).toHaveLength(1);
  });
});
