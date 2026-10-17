import { describe, expect, it } from 'vitest';
import { anchorHeadings } from '@/lib/utils/heading-anchors';
import { sanitizeRichHtml } from '@/lib/utils/rich-html';

/** F02-3: якоря разделов биографии для оглавления (решение арбитра, `F02 | F02-3`, Р1). */
describe('anchorHeadings', () => {
  it('ставит h3 id с префиксом и возвращает якоря по порядку', () => {
    const { html, anchors } = anchorHeadings('<h3>Детство</h3><p>x</p><h3>Юность</h3>', 'bio');

    expect(anchors).toEqual([
      { id: 'bio-detstvo', text: 'Детство' },
      { id: 'bio-yunost', text: 'Юность' },
    ]);
    expect(html).toBe('<h3 id="bio-detstvo">Детство</h3><p>x</p><h3 id="bio-yunost">Юность</h3>');
  });

  it('одинаковые заголовки получают разные id', () => {
    const { anchors } = anchorHeadings('<h3>Годы</h3><h3>Годы</h3><h3>Годы</h3>', 'bio');

    expect(anchors.map((a) => a.id)).toEqual(['bio-gody', 'bio-gody-2', 'bio-gody-3']);
  });

  it('заголовок без букв и цифр — bio-section-N, текст и сущности разобраны', () => {
    const { anchors } = anchorHeadings(
      '<h3><em>Война</em> &amp; мир</h3><h3>…</h3><h3 style="text-align: center">1869</h3>',
      'bio'
    );

    expect(anchors).toEqual([
      { id: 'bio-voyna-mir', text: 'Война & мир' },
      { id: 'bio-section-2', text: '…' },
      { id: 'bio-1869', text: '1869' },
    ]);
  });

  // 🔴 `id` ставится после санитайзера: тот `id` не пропускает, и якорь, поставленный до него,
  // молча исчез бы из страницы — оглавление вело бы в никуда.
  it('id из данных не доживает до вывода, свой — доживает', () => {
    const clean = sanitizeRichHtml('<h3 id="evil">Детство</h3>');
    const { html } = anchorHeadings(clean, 'bio');

    expect(html).toBe('<h3 id="bio-detstvo">Детство</h3>');
  });

  it('без h3 HTML не меняется', () => {
    const source = '<p>Старая биография без разделов.</p>';
    expect(anchorHeadings(source, 'bio')).toEqual({ html: source, anchors: [] });
  });

  // Пересказ книги: разделы - `h2`, `h3` внутри раздела якоря не получают.
  it('tag h2: якоря только у h2', () => {
    const { html, anchors } = anchorHeadings(
      '<h2>Акт I</h2><h3>Сцена</h3><h2>Акт II</h2>',
      'part',
      'h2'
    );

    expect(anchors.map((a) => a.id)).toEqual(['part-akt-i', 'part-akt-ii']);
    expect(html).toBe(
      '<h2 id="part-akt-i">Акт I</h2><h3>Сцена</h3><h2 id="part-akt-ii">Акт II</h2>'
    );
  });
});
