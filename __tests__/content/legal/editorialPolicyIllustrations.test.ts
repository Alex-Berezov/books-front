// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getLegalDocument } from '@/content/legal';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import type { LegalBlock } from '@/content/legal/types';

/**
 * F08-11c (`product.md` §8, §12): подпись иллюстрации ведёт на раздел `world` редполитики, и в этом
 * разделе на каждом языке есть абзац об иллюстрациях. Слов «ИИ»/«нейросеть» в политике нет
 * (сторож F01-4 в `trustPages.test.tsx`). С F08-11d сайт картинки не генерирует: абзац говорит,
 * что их вручную готовит редакция сторонними сервисами генерации изображений, а не «модель».
 */
const paragraphText = (block: LegalBlock): string =>
  block.kind === 'paragraph' ? block.content.map((part) => part.text).join('') : '';

const ILLUSTRATIONS: Record<(typeof SUPPORTED_LANGS)[number], RegExp> = {
  en: /^Illustrations of characters are prepared manually by the editorial team with third-party image generation services/,
  es: /^Las ilustraciones de los personajes las prepara manualmente la redacción con servicios externos de generación de imágenes/,
  fr: /^Les illustrations des personnages sont préparées manuellement par la rédaction avec des services tiers de génération d’images/,
  pt: /^As ilustrações dos personagens são preparadas manualmente pela redação com serviços externos de geração de imagens/,
  ru: /^Иллюстрации героев редакция готовит вручную с помощью сторонних сервисов генерации изображений/,
};

/** Прежняя формулировка F08-11c — генерация «моделью» на стороне сайта — неправдива с F08-11d. */
const SITE_MODEL: Record<(typeof SUPPORTED_LANGS)[number], RegExp> = {
  en: /image generation model/,
  es: /modelo de generación de imágenes/,
  fr: /modèle de génération d’images/,
  pt: /modelo de geração de imagens/,
  ru: /моделью генерации изображений/,
};

describe('editorial policy: illustrations paragraph', () => {
  it.each(SUPPORTED_LANGS)('%s: the world section has the illustrations paragraph', (lang) => {
    const world = getLegalDocument('editorial-policy', lang).sections.find((s) => s.id === 'world');
    expect(world).toBeDefined();
    const paragraphs = (world?.blocks ?? []).map(paragraphText);
    expect(paragraphs.filter((text) => ILLUSTRATIONS[lang].test(text))).toHaveLength(1);
    expect(paragraphs.filter((text) => SITE_MODEL[lang].test(text))).toHaveLength(0);
  });
});
