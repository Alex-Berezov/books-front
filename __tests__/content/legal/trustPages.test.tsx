import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LegalPage } from '@/components/public/legal/LegalPage';
import { getLegalDocument } from '@/content/legal';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
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

// «Люди» и «модель» на пяти языках - корнями слов; один набор на все тесты файла.
const PEOPLE = 'люд|человек|human|humain|humano|people|personas|personne|pessoa';
const MODEL = /модел|model|modelo|modèle/iu;
const SUMMARY = /пересказ|summar|resum|resúm|résum/iu;
const BREAKDOWN = /разбор|analys|análisis|análise/iu;
// Двоеточие не режет предложение: «Пересказы готовит редакция: часть - с помощью моделей».
const sentences = (text: string) => text.split(/(?<=[.;])\s+/u);

const ids = (page: TrustPage) => getLegalDocument(page, 'en').sections.map((section) => section.id);

const sectionParts = (page: TrustPage, lang: SupportedLang, sectionIds: string[]) => {
  const doc = getLegalDocument(page, lang);
  return parts({ ...doc, sections: doc.sections.filter((s) => sectionIds.includes(s.id)) });
};

const sectionText = (page: TrustPage, lang: SupportedLang, sectionIds: string[]): string =>
  sectionParts(page, lang, sectionIds)
    .map((part) => part.text)
    .join(' ');

describe('страницы доверия: состав', () => {
  it('о нас: пять разделов по порядку', () => {
    expect(ids('about')).toEqual(['what', 'readers', 'who', 'how', 'contact']);
  });

  it('контакты: четыре блока и срок ответа со ссылкой на сведения об операторе (F01-6)', () => {
    expect(ids('contact')).toEqual(['general', 'corrections', 'rights', 'privacy', 'response']);
  });

  // F03-3: раздел об анализе книг (решение арбитра `F03 | F03-3`, В5) - цель подписи страницы анализа.
  it('редакционная политика: якоря с #analysis, #translations и #authors, без #independence', () => {
    expect(ids('editorial-policy')).toEqual([
      'who',
      'sources',
      'preparation',
      'summaries',
      'analysis',
      'translations',
      'authors',
      'corrections',
    ]);
  });

  // F02-4 (решение арбитра 16.10.2026, `F02 | F02-4`, Р1): раздел о страницах авторов говорит,
  // откуда сведения, и не утверждает ни «пишут люди», ни «проверяется редакцией» (README F02).
  it.each(SUPPORTED_LANGS)('%s: #authors есть, без «пишут люди» и «проверяется»', (lang) => {
    const doc = getLegalDocument('editorial-policy', lang);
    const section = doc.sections.find((s) => s.id === 'authors');
    expect(section).toBeDefined();
    const text = parts({ ...doc, sections: section ? [section] : [] })
      .map((part) => part.text)
      .join(' ');
    expect(text).toMatch(/\S/);
    // «пишут люди» и «проверяет редакция» на пяти языках — корнями слов, без общих слов вроде «check».
    expect(text).not.toMatch(new RegExp(`${PEOPLE}|провер|verif|vérif|comprob|reviewed`, 'iu'));
  });

  // F06-4 (D2/D5): пересказы и разборы готовит редакция с помощью моделей; «пишут люди» - только про описания.
  it.each(SUPPORTED_LANGS)('%s: #who политики и «О нас» - люди только у описаний', (lang) => {
    const DESCRIPTION = /описан|description|descripci|descriç/iu;
    const PART = /част|some|parte|partie/iu;
    const who = sectionText('editorial-policy', lang, ['who']);
    const about = sectionText('about', lang, ['who', 'how']);
    for (const text of [who, about]) {
      // Про пересказы сказано, что часть их готовят с помощью моделей, - одним предложением,
      // отдельным от предложения про сверку второй моделью (в нём «2026»).
      expect(
        sentences(text).some(
          (s) => SUMMARY.test(s) && MODEL.test(s) && PART.test(s) && !/2026/u.test(s)
        )
      ).toBe(true);
      // Предложение про людей есть и не называет пересказы.
      const withPeople = sentences(text).filter((s) => new RegExp(PEOPLE, 'iu').test(s));
      expect(withPeople.length).toBeGreaterThan(0);
      expect(withPeople.filter((s) => SUMMARY.test(s) || BREAKDOWN.test(s))).toEqual([]);
      expect(withPeople.filter((s) => !DESCRIPTION.test(s))).toEqual([]);
    }
    // «Редакторы пишут пересказы» на «О нас» не осталось.
    expect(about).not.toMatch(
      /пишут пересказы|write summaries|escribe los resúmenes|rédige les résumés|escreve os resumos/iu
    );
    // #summaries не обещает сверки всех пересказов (решение арбитра `F06 | F06-4`, дополнение).
    expect(sectionText('editorial-policy', lang, ['summaries'])).not.toMatch(
      /сверя|checked|contrast|vérifi|conferid/iu
    );
    // Сверка второй моделью с ноября 2026 названа в политике одним предложением.
    expect(sentences(who).some((s) => /2026/u.test(s) && MODEL.test(s))).toBe(true);
  });

  // F03-3 (В5), F07-4: анализ составляет модель - раздел об этом говорит, не обещает ручной сверки
  // и называет автоматическую проверку номеров глав;
  // строка #who отсылает к разделу анализа его заголовком.
  it.each(SUPPORTED_LANGS)(
    '%s: #analysis - о языковой модели, без «пишут люди» и сверки',
    (lang) => {
      const doc = getLegalDocument('editorial-policy', lang);
      const text = (id: string) => sectionText('editorial-policy', lang, [id]);
      const analysis = text('analysis');
      expect(analysis).toMatch(MODEL);
      expect(analysis).not.toMatch(new RegExp(`${PEOPLE}|сверя|вручную|manual`, 'iu'));
      // Проверка, которая есть, - автоматическая проверка номеров глав при загрузке (§21.3, ревью F03-3 круг 2).
      expect(analysis).toMatch(
        /автоматически|automatically|automáticamente|automatiquement|automaticamente/iu
      );
      expect(
        sectionParts('editorial-policy', lang, ['analysis']).find((part) => part.kind === 'link')
      ).toMatchObject({
        href: '/contact',
      });
      // Отсылка из #who к разделу анализа - его заголовком.
      const heading = doc.sections.find((s) => s.id === 'analysis')?.heading ?? '';
      expect(heading).not.toBe('');
      expect(text('who')).toContain(heading);
    }
  );

  // F07-4: анализ пишется по тексту книги, вторая модель проверяет, внешние сведения - только с источником;
  // прежнего «черновик + модель получает только сведения о версии» в политике нет.
  it.each(SUPPORTED_LANGS)(
    '%s: #analysis и #who - текст книги, вторая модель, источники',
    (lang) => {
      const analysis = sentences(sectionText('editorial-policy', lang, ['analysis']));
      const who = sentences(sectionText('editorial-policy', lang, ['who']));
      const BOOK_TEXT =
        /текст этой версии книги|text of this version of the book|texto de esta versión del libro|texte de cette version du livre|texto desta versão do livro/iu;
      const SECOND = /втор|second|segundo/iu;
      const DEVELOPER =
        /другого разработчика|different developer|otro desarrollador|autre développeur|outro desenvolvedor/iu;
      const OUTSIDE =
        /не из самой книги|outside the book|fuera del libro|extérieur du livre|fora do livro/iu;
      const ONLY_WITH_SOURCE =
        /только с источником|only with a source|solo con una fuente|qu’avec une source|só entra[^.]*com uma fonte/iu;
      const DRAFT = /черновик|draft|borrador|brouillon|rascunho/iu;
      expect(analysis.some((s) => BOOK_TEXT.test(s) && MODEL.test(s))).toBe(true);
      expect(analysis.some((s) => SECOND.test(s) && MODEL.test(s) && DEVELOPER.test(s))).toBe(true);
      expect(analysis.some((s) => OUTSIDE.test(s) && ONLY_WITH_SOURCE.test(s))).toBe(true);
      expect(analysis.join(' ')).not.toMatch(DRAFT);
      // Ручной путь F03 остаётся: готовый анализ можно загрузить.
      expect(analysis.join(' ')).toMatch(
        /загрузить готовым|uploaded ready-made|cargarse ya terminado|importée toute prête|carregada já pronta/iu
      );
      // Фраза про вторую модель называет и пересказы, и разборы.
      const sentence = who.find((s) => /2026/u.test(s) && MODEL.test(s)) ?? '';
      expect(sentence).toMatch(SUMMARY);
      expect(sentence).toMatch(BREAKDOWN);
    }
  );

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
    // #analysis, #authors и #corrections — все ведут на «Контакты» (Р1, Р12 `F02 | F02-4`;
    // раздел об анализе — П6 брифа F03-3, решение арбитра `F03 | F03-3`, В5).
    expect(links(getLegalDocument('editorial-policy', lang))).toEqual([
      '/contact',
      '/contact',
      '/contact',
    ]);
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
      // Решение арбитра `F06 | F06-4`: единственная цифра - год «2026» в #who политики (формулировка
      // владельца), ровно одно вхождение; остальной текст обеих страниц - без цифр, как в F01-4.
      const YEAR = /(?<!\d)2026(?!\d)/gu;
      const isPolicy = page === 'editorial-policy';
      const who = sectionText(page, lang, ['who']);
      expect(isPolicy ? (who.match(YEAR) ?? []).length : 0).toBe(isPolicy ? 1 : 0);
      // Вырезается одно «2026» из текста самого #who, а не первое во всей странице.
      // Текст #who - подстрока текста страницы; функция замены не толкует `$` в тексте.
      expect(text.includes(who)).toBe(true);
      const rest = isPolicy ? text.replace(who, () => who.replace(YEAR, '')) : text;
      expect(rest).not.toMatch(/\d/);
      // `\b` не видит кириллицу: границы слова - через `\p{L}` с флагом `u`.
      expect(text).not.toMatch(/(?<!\p{L})(AI|IA|ИИ)(?!\p{L})|artificial|искусствен|нейросет/iu);
    }
  });
});
