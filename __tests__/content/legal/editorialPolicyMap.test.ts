// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getLegalDocument } from '@/content/legal';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import type { LegalBlock } from '@/content/legal/types';

/**
 * F08-12d (решение арбитра `F08 | F08-12c` Q5, бриф `project-manager`): раздел `world` редполитики
 * говорит, откуда точка реального места (только Wikidata, координаты читает сайт), когда её нет
 * (проверка записи; вымышленное место - никогда), что она не обновляется сама и что подложка -
 * OpenStreetMap с подписью. Абзац - последний в разделе, после иллюстраций; якорь `world` прежний.
 */
const paragraphText = (block: LegalBlock): string =>
  block.kind === 'paragraph' ? block.content.map((part) => part.text).join('') : '';

/** Абзац об иллюстрациях - тот, после которого стоит абзац о карте. */
const ILLUSTRATIONS: Record<(typeof SUPPORTED_LANGS)[number], RegExp> = {
  en: /Illustrations/,
  es: /ilustraciones/i,
  fr: /illustrations/i,
  pt: /ilustrações/i,
  ru: /Иллюстрации/,
};

const MAP: Record<(typeof SUPPORTED_LANGS)[number], RegExp[]> = {
  en: [
    /only from Wikidata/,
    /a fictional place never has one/,
    /does not update by itself/,
    /checked again when the Wikidata number or the names of the place change/,
  ],
  es: [
    /solo de Wikidata/,
    /un lugar ficticio no lo tiene nunca/,
    /no se actualiza por sí solo/,
    /se vuelve a comprobar cuando cambian el número de Wikidata/,
  ],
  fr: [
    /uniquement de Wikidata/,
    /un lieu fictif n’en a jamais/,
    /ne se met pas à jour/,
    /revérifié lorsque le numéro Wikidata ou les noms du lieu changent/,
  ],
  pt: [
    /apenas do Wikidata/,
    /um lugar fictício nunca o tem/,
    /não se atualiza sozinho/,
    /volta a ser verificado quando mudam o número do Wikidata/,
  ],
  ru: [
    /только из Wikidata/,
    /у вымышленного места её не бывает никогда/,
    /сама она не обновляется/,
    /проверяется заново, когда у места меняются номер Wikidata или названия/,
  ],
};

describe('editorial policy: the literary map paragraph', () => {
  it.each(SUPPORTED_LANGS)('%s: source of the point, when there is none, OSM credit', (lang) => {
    const world = getLegalDocument('editorial-policy', lang).sections.find((s) => s.id === 'world');
    const paragraphs = (world?.blocks ?? []).map(paragraphText);
    const last = paragraphs[paragraphs.length - 1];
    for (const pattern of MAP[lang]) expect(last).toMatch(pattern);
    expect(last).toContain('© OpenStreetMap contributors');
    // Абзац один - последний в разделе, сразу после абзаца об иллюстрациях.
    expect(paragraphs.filter((p) => p.includes('Wikidata'))).toEqual([last]);
    expect(paragraphs[paragraphs.length - 2]).toMatch(ILLUSTRATIONS[lang]);
  });
});
