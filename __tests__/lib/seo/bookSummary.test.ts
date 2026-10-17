import { describe, expect, it } from 'vitest';
import {
  buildSummaryAlternates,
  describeSummary,
  pickSummaryVersion,
  readingMinutes,
  summaryPath,
  summaryPlainText,
  versionHasSummary,
} from '@/lib/seo/book-summary';
import { buildLangUrl } from '@/lib/seo/urls';
import type { VersionPreview } from '@/types/api-schema';

/**
 * Правила страницы пересказа (решение владельца 17.10.2026): версия - языка страницы, кластер
 * hreflang - только языки с пересказом. Их же читают кнопка на странице книги и карта сайта.
 */

const v = (language: VersionPreview['language'], slug: string, summaries?: number) =>
  ({
    id: `v-${language}`,
    type: 'text',
    isFree: true,
    translators: [],
    language,
    slug,
    ...(summaries === undefined ? {} : { _count: { chapters: 1, audioChapters: 0, summaries } }),
  }) as VersionPreview;

describe('pickSummaryVersion', () => {
  const book = { versions: [v('en', 'hamlet', 1), v('ru', 'gamlet', 0), v('fr', 'hamlet-fr')] };

  it('версия языка страницы с пересказом', () => {
    expect(pickSummaryVersion(book, 'en')?.id).toBe('v-en');
  });

  it('у языка нет пересказа - null, пересказ другого языка не подставляется', () => {
    expect(pickSummaryVersion(book, 'ru')).toBeNull();
    expect(pickSummaryVersion(book, 'es')).toBeNull();
  });

  it('счётчика нет - пересказ не подтверждён', () => {
    expect(pickSummaryVersion(book, 'fr')).toBeNull();
    expect(versionHasSummary(v('fr', 'x'))).toBe(false);
  });
});

describe('buildSummaryAlternates', () => {
  it('только языки с пересказом, x-default - английский', () => {
    const book = {
      versions: [v('en', 'hamlet', 1), v('fr', 'hamlet-fr', 2), v('ru', 'gamlet', 0)],
    };

    expect(buildSummaryAlternates(book.versions)).toEqual({
      en: buildLangUrl('en', '/book/hamlet/summary'),
      fr: buildLangUrl('fr', '/book/hamlet-fr/summary'),
      'x-default': buildLangUrl('en', '/book/hamlet/summary'),
    });
  });

  it('построитель адреса передаётся снаружи (карта сайта)', () => {
    const alternates = buildSummaryAlternates([v('en', 'hamlet', 1)], (l, s) => `B/${l}/${s}`);
    expect(alternates).toEqual({ en: 'B/en/hamlet', 'x-default': 'B/en/hamlet' });
  });

  it('ни одного языка с пересказом - кластера нет', () => {
    expect(buildSummaryAlternates([v('ru', 'gamlet', 0)])).toBeUndefined();
  });
});

describe('текст и время чтения', () => {
  it('путь страницы', () => {
    expect(summaryPath('hamlet')).toBe('/book/hamlet/summary');
  });

  it('видимый текст без тегов и с расшифрованными сущностями', () => {
    expect(summaryPlainText('<h2>Акт&nbsp;I</h2><p>Призрак &laquo;отца&raquo;</p>')).toBe(
      'Акт I Призрак «отца»'
    );
  });

  // Одно правило с бэкендом (`richHtmlText`): что бэкенд не сохранил бы, то и здесь не текст.
  it.each(['<p>&#32;</p>', '<p>&#x20;&#9;</p>', '<p>&#8203;</p>', '<p>&ensp;&shy;</p>'])(
    'пробельные сущности и знаки нулевой ширины - не текст: %s',
    (html) => {
      expect(summaryPlainText(html)).toBe('');
    }
  );

  it('выброшенный санитайзером скрипт - не текст', () => {
    expect(summaryPlainText('<script>alert(1)</script>')).toBe('');
  });

  it('описание - начало сюжета без заголовков разделов', () => {
    expect(
      describeSummary('<h2>Act I</h2><p>The ghost appears.</p><h2>Act II</h2><p>Madness.</p>')
    ).toBe('The ghost appears. Madness.');
  });

  it('минуты: 230 слов в минуту, не меньше одной, пустой текст - 0', () => {
    expect(readingMinutes('')).toBe(0);
    expect(readingMinutes('one two')).toBe(1);
    expect(readingMinutes(Array(2300).fill('w').join(' '))).toBe(10);
  });
});
