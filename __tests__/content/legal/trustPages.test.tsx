import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LegalPage } from '@/components/public/legal/LegalPage';
import { getLegalDocument } from '@/content/legal';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import { contactGeneral } from '@/lib/site/owner-facts';
import type { LegalDocument, LegalInline } from '@/content/legal/types';

/**
 * Страницы доверия (`F01-4`, `product.md` §3-5): состав и порядок разделов, ссылки между ними и то,
 * чего на страницах быть не должно, пока нет источника факта (решение арбитра 13.10.2026).
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/en/about',
}));

type TrustPage = 'about' | 'contact' | 'editorial-policy';

const parts = (doc: LegalDocument): LegalInline[] =>
  doc.sections.flatMap((section) =>
    section.blocks.flatMap((block) => {
      if (block.kind === 'widget') return [];
      if (block.kind === 'table') return block.rows.flat(2);
      return block.kind === 'list' ? block.items.flat() : block.content;
    })
  );

const links = (doc: LegalDocument) =>
  parts(doc).flatMap((part) => (part.kind === 'link' ? [part.href] : []));

const ids = (page: TrustPage) => getLegalDocument(page, 'en').sections.map((section) => section.id);

describe('страницы доверия: состав', () => {
  it('о нас: пять разделов по порядку', () => {
    expect(ids('about')).toEqual(['what', 'readers', 'who', 'how', 'contact']);
  });

  it('контакты: четыре блока и срок ответа со ссылкой на сведения об операторе (F01-6)', () => {
    expect(ids('contact')).toEqual(['general', 'corrections', 'rights', 'privacy', 'response']);
  });

  it('редакционная политика: якоря с #translations, без #independence', () => {
    expect(ids('editorial-policy')).toEqual([
      'who',
      'sources',
      'preparation',
      'summaries',
      'translations',
      'corrections',
    ]);
  });

  it.each(SUPPORTED_LANGS)(
    '%s: в #corrections сказано про дату «Обновлено» у пересказа, подпись совпадает со словарём',
    (lang) => {
      const doc = getLegalDocument('editorial-policy', lang);
      const corrections = doc.sections.find((section) => section.id === 'corrections');
      // Подпись в тексте политики - слово в кавычках; в словаре оно начинает строку «Обновлено {date}».
      // Кавычек в разделе может быть несколько: подпись должна совпасть хотя бы с одной цитатой.
      const quotes = Array.from(
        JSON.stringify(corrections).matchAll(/[«“]\s?([^»”]+?)\s?[»”]/g),
        (match) => match[1]
      );
      const label = getDictionary(lang).book.updatedOn;
      expect(label).toContain('{date}');
      // Цитата - подпись целиком (не меньше слова): за ней в словаре пробел или конец подписи.
      expect(
        quotes.some((quote) => quote.length >= 4 && new RegExp(`^${quote}( |$)`).test(label))
      ).toBe(true);
    }
  );

  it.each(SUPPORTED_LANGS)('%s: в #translations сказано, где указывается переводчик', (lang) => {
    const section = getLegalDocument('editorial-policy', lang).sections.find(
      (item) => item.id === 'translations'
    );
    const text = parts({ ...getLegalDocument('editorial-policy', lang), sections: [section!] })
      .map((part) => part.text)
      .join('');
    expect(section?.heading.trim()).toBeTruthy();
    expect(text.trim().length).toBeGreaterThan(30);
    if (lang !== 'en') {
      const en = getLegalDocument('editorial-policy', 'en').sections.find(
        (item) => item.id === 'translations'
      );
      expect(section?.heading).not.toBe(en?.heading);
    }
  });

  it.each(SUPPORTED_LANGS)('%s: ссылки между страницами ведут на существующие якоря', (lang) => {
    expect(links(getLegalDocument('about', lang))).toEqual(['/editorial-policy', '/contact']);
    expect(links(getLegalDocument('contact', lang))).toEqual([
      '/editorial-policy#corrections',
      '/privacy',
      '/deletion',
      '/legal-notice',
    ]);
    expect(links(getLegalDocument('editorial-policy', lang))).toEqual(['/contact']);
    expect(ids('editorial-policy')).toContain('corrections');
  });
});

describe('контакты: письма', () => {
  it.each(SUPPORTED_LANGS)('%s: у ошибки в тексте тема письма на языке страницы', (lang) => {
    const doc = getLegalDocument('contact', lang);
    const { container } = render(<LegalPage document={doc} />);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    const subjects = parts(doc).flatMap((part) =>
      part.kind === 'mailto' && part.subject ? [part.subject] : []
    );
    expect(subjects).toHaveLength(1);
    expect(hrefs).toContain(`mailto:${contactGeneral}?subject=${encodeURIComponent(subjects[0])}`);
  });

  it.each(SUPPORTED_LANGS)('%s: правообладателям - перечень из четырёх пунктов', (lang) => {
    const rights = getLegalDocument('contact', lang).sections.find((s) => s.id === 'rights');
    const list = rights?.blocks.find((block) => block.kind === 'list');
    expect(list?.kind === 'list' ? list.items : []).toHaveLength(4);
  });

  it('тема с `&`, `?` и переводом строки не становится частью адреса', () => {
    const doc = getLegalDocument('contact', 'en');
    const subject = 'A & B?\nbody=x';
    const { container } = render(
      <LegalPage
        document={{
          ...doc,
          sections: [
            {
              id: 'probe',
              heading: 'Probe',
              blocks: [
                {
                  kind: 'paragraph',
                  content: [{ kind: 'mailto', text: 'mail', email: contactGeneral, subject }],
                },
              ],
            },
          ],
        }}
      />
    );
    const href = container.querySelector('a[href^="mailto:"]')?.getAttribute('href') ?? '';
    expect(href).toBe(`mailto:${contactGeneral}?subject=A%20%26%20B%3F%0Abody%3Dx`);
    expect(new URL(href).searchParams.get('subject')).toBe(subject);
  });
});

describe('о нас и редполитика: без выдумки', () => {
  it.each(SUPPORTED_LANGS)('%s: нет цифр и фразы про запрет ИИ', (lang) => {
    for (const page of ['about', 'editorial-policy'] as const) {
      const text = parts(getLegalDocument(page, lang))
        .map((part) => part.text)
        .join(' ');
      expect(text).not.toMatch(/\d/);
      // `\b` не видит кириллицу: границы слова - через `\p{L}` с флагом `u`.
      expect(text).not.toMatch(/(?<!\p{L})(AI|IA|ИИ)(?!\p{L})|artificial|искусствен|нейросет/iu);
    }
  });
});
