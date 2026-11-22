import { readFileSync } from 'fs';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  isPlainChapter,
  readerParagraphs,
  showLinkedParagraph,
} from '@/components/common/ReaderView/readerParagraphs';
import { sanitizeRichHtml } from '@/lib/utils/rich-html';

/**
 * Номер абзаца читалки и бэкенда один (`F08-10a`, решение арбитра `F08 | F08-10` Q2). Фикстура -
 * копия `books/test/fixtures/reader-paragraphs.json`; по своей копии бэкенд сверяет свою сторону
 * (`books/src/modules/translation/content-draft/content-draft.paragraphs.spec.ts`). Копии между
 * собой не сверяет ничто: менять обе вместе. Считается DOM, который покажет `RichTextContent`:
 * HTML после `sanitizeRichHtml`.
 */
describe('readerParagraphs: the backend paragraph rule on the reader DOM (F08-10a)', () => {
  afterEach(() => {
    // jsdom своего `scrollIntoView` не держит: подмена не переживает тест; слушатели отмены
    // повтора прокрутки снимаются действием читателя.
    window.dispatchEvent(new Event('keydown'));
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
  });

  const fixture = JSON.parse(
    readFileSync(join(__dirname, '../../../fixtures/reader-paragraphs.json'), 'utf8')
  ) as { html: string; paragraphs: string[] };

  const container = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = sanitizeRichHtml(html);
    return div;
  };

  it('the shared fixture gives the backend paragraphs in the same order', () => {
    expect(readerParagraphs(container(fixture.html)).map((p) => p.text)).toEqual(
      fixture.paragraphs
    );
  });

  it('a leaf block is its own element, inline nodes in a row are one paragraph', () => {
    const got = readerParagraphs(container('<p>One</p>loose <em>text</em><p>Two</p>'));
    expect(got.map((p) => p.nodes.length)).toEqual([1, 2, 1]);
    expect((got[0].nodes[0] as Element).tagName).toBe('P');
  });

  it('a plain chapter without tags is one text run', () => {
    expect(readerParagraphs(container('First.\n\nSecond.')).length).toBe(1);
  });

  it('inline nodes in a row are highlighted inside one wrapper, a missing number is false', () => {
    const div = container('<p>One</p>loose <em>text</em><p>Two</p>');
    expect(showLinkedParagraph(div, 2, 'hl')).toBe(true);
    const wrapped = div.querySelector('.hl') as HTMLElement;
    expect(wrapped.tagName).toBe('SPAN');
    expect(wrapped.textContent).toBe('loose text');
    expect(readerParagraphs(div).map((x) => x.text)).toEqual(['One', 'loose text', 'Two']);
    expect(showLinkedParagraph(div, 9, 'hl')).toBe(false);
  });

  it('a chapter without tags is plain - the backend isPlainText rule', () => {
    expect(isPlainChapter('First.\n\nSecond.')).toBe(true);
    expect(isPlainChapter('<p>First.</p>')).toBe(false);
  });

  it('an image above the paragraph that loads later scrolls to the paragraph again', () => {
    const div = container(
      '<figure><img src="https://cdn.example.test/a.webp"></figure><p>One</p><p>Two</p><img src="https://cdn.example.test/b.webp">'
    );
    const scrolled: string[] = [];
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this.textContent ?? '');
    };
    const [above, below] = [...div.querySelectorAll('img')];
    Object.defineProperty(above, 'complete', { value: false });
    Object.defineProperty(below, 'complete', { value: false });

    showLinkedParagraph(div, 2, 'hl');
    below.dispatchEvent(new Event('load'));
    above.dispatchEvent(new Event('load'));
    above.dispatchEvent(new Event('load'));

    expect(scrolled).toEqual(['Two', 'Two']);
  });

  it.each(['wheel', 'touchstart', 'keydown', 'pointerdown'])(
    'after the reader acts (%s), a late image no longer pulls back to the paragraph',
    (type) => {
      const div = container(
        '<figure><img src="https://cdn.example.test/a.webp"></figure><p>One</p>'
      );
      let scrolls = 0;
      Element.prototype.scrollIntoView = () => {
        scrolls++;
      };
      const [img] = [...div.querySelectorAll('img')];
      Object.defineProperty(img, 'complete', { value: false });

      showLinkedParagraph(div, 1, 'hl');
      window.dispatchEvent(new Event(type));
      img.dispatchEvent(new Event('load'));

      expect(scrolls).toBe(1);
    }
  );
});
