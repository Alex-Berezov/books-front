// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getLegalDocument } from '@/content/legal';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import type { LegalBlock } from '@/content/legal/types';

/**
 * F08-11c (`product.md` §8, §12): подпись иллюстрации ведёт на раздел `world` редполитики, и в этом
 * разделе на каждом языке есть абзац об иллюстрациях. Слов «ИИ»/«нейросеть» в политике нет
 * (сторож F01-4 в `trustPages.test.tsx`): абзац говорит «модель генерации изображений».
 */
const paragraphText = (block: LegalBlock): string =>
  block.kind === 'paragraph' ? block.content.map((part) => part.text).join('') : '';

const ILLUSTRATIONS: Record<(typeof SUPPORTED_LANGS)[number], RegExp> = {
  en: /^Illustrations of characters are created with an image generation model/,
  es: /^Las ilustraciones de los personajes se crean con un modelo de generación de imágenes/,
  fr: /^Les illustrations des personnages sont créées avec un modèle de génération d’images/,
  pt: /^As ilustrações dos personagens são criadas com um modelo de geração de imagens/,
  ru: /^Иллюстрации героев создаются моделью генерации изображений/,
};

describe('editorial policy: illustrations paragraph', () => {
  it.each(SUPPORTED_LANGS)('%s: the world section has the illustrations paragraph', (lang) => {
    const world = getLegalDocument('editorial-policy', lang).sections.find((s) => s.id === 'world');
    expect(world).toBeDefined();
    const paragraphs = (world?.blocks ?? []).map(paragraphText);
    expect(paragraphs.filter((text) => ILLUSTRATIONS[lang].test(text))).toHaveLength(1);
  });
});
