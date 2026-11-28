import { describe, expect, it } from 'vitest';
import {
  buildLinkIndex,
  entityHrefByName,
  entityTargetByName,
  createLinkSession,
  foldKeepingLength,
  foldMention,
  LINK_ENTITIES_PAGE_LIMIT,
  linkHtml,
  linkText,
  markLinked,
} from '@/lib/book-world/link-entities';
import type { BookWorldListEntity } from '@/types/api-schema';

const entity = (key: string, forms: string[], extra: Partial<BookWorldListEntity> = {}) =>
  ({
    key,
    type: 'character',
    name: forms[0] ?? key,
    role: null,
    short: null,
    hasCore: true,
    isIndexable: true,
    mentionFirst: 1,
    updatedAt: '2026-01-01T00:00:00.000Z',
    forms,
    ...extra,
  }) as BookWorldListEntity;

const hrefOf = (key: string) => `/ru/book/b/wiki/${key}`;
const chapter = {
  template: 'Глава {n}',
  href: (n: number) => (n <= 5 ? `/ru/book/b/read?chapter=${n}` : null),
};
const session = (entities: BookWorldListEntity[], opts?: { selfKey?: string; limit?: number }) =>
  createLinkSession(buildLinkIndex(entities, hrefOf, chapter), opts);
const kinds = (text: string, s: ReturnType<typeof session>) =>
  linkText(text, s).map((x) => (x.kind === 'text' ? x.text : `[${x.kind}:${x.text}]`));

describe('foldMention', () => {
  it('сворачивает регистр, ё, кавычки и пробелы', () => {
    expect(foldMention('  Фёдор  «Ё» ')).toBe('федор "е"');
  });
});

describe('linkText', () => {
  const heroes = [entity('anna', ['Анна', 'Анны']), entity('petr', ['Пётр'])];

  it('ссылается только на первое упоминание', () => {
    expect(kinds('Анна и Анна. Анны нет.', session(heroes))).toEqual([
      '[entity:Анна]',
      ' и Анна. Анны нет.',
    ]);
  });

  it('форма в другом регистре и ё=е находятся', () => {
    expect(kinds('видел ПЕТР', session(heroes))).toEqual(['видел ', '[entity:ПЕТР]']);
  });

  it('середина слова не ссылка', () => {
    expect(kinds('Аннабель', session(heroes))).toEqual(['Аннабель']);
  });

  it('форма у двух сущностей - без ссылки', () => {
    const s = session([entity('a', ['Симон']), entity('b', ['Симон', 'Киринеянин'])]);
    expect(kinds('Симон, Киринеянин', s)).toEqual(['Симон, ', '[entity:Киринеянин]']);
  });

  it('форма короче трёх букв не ищется', () => {
    expect(kinds('Он Ли', session([entity('li', ['Ли'])]))).toEqual(['Он Ли']);
  });

  it('сущность без ядра и редакторская строка пропускаются', () => {
    const s = session([entity('x', ['Борис'], { hasCore: false })]);
    expect(kinds('Борис', s)).toEqual(['Борис']);
  });

  it('цитата в кавычках ссылок не получает, имя после неё - получает', () => {
    expect(kinds('Он сказал: «Анна ушла». Анна ждёт.', session(heroes))).toEqual([
      'Он сказал: «Анна ушла». ',
      '[entity:Анна]',
      ' ждёт.',
    ]);
  });

  it('на себя не ссылается', () => {
    expect(kinds('Анна', session(heroes, { selfKey: 'anna' }))).toEqual(['Анна']);
  });

  it('не больше предела на страницу', () => {
    expect(kinds('Анна Пётр', session(heroes, { limit: 1 }))).toEqual(['[entity:Анна]', ' Пётр']);
  });

  it('«Глава N» - ссылка только на существующую главу и в форме словаря', () => {
    expect(kinds('Глава 2 и Глава 9, в главе 3', session(heroes))).toEqual([
      '[chapter:Глава 2]',
      ' и Глава 9, в главе 3',
    ]);
  });

  it('главы не расходуют предел и не ограничены одной', () => {
    expect(kinds('Глава 1, Глава 1', session(heroes, { limit: 0 }))).toEqual([
      '[chapter:Глава 1]',
      ', ',
      '[chapter:Глава 1]',
    ]);
  });

  it('форма с кавычкой-апострофом находится в тексте с типографским', () => {
    const s = session([entity('d', ["О'Брайен"])]);
    expect(kinds('сказал О’Брайен', s)).toEqual(['сказал ', '[entity:О’Брайен]']);
  });
});

describe('linkHtml', () => {
  const heroes = [entity('anna', ['Анна'])];

  it('меняет только текстовые узлы, разметка остаётся', () => {
    const html = '<p>Это <em>Анна</em> &amp; друг.</p>';
    expect(linkHtml(html, session(heroes))).toBe(
      '<p>Это <em><a href="/ru/book/b/wiki/anna">Анна</a></em> &amp; друг.</p>'
    );
  });

  it('без совпадений HTML не меняется побайтно', () => {
    const html = '<p>Текст &laquo;так&raquo; <br/> дальше</p>';
    expect(linkHtml(html, session(heroes))).toBe(html);
  });

  it.each([
    ['<h2>Анна</h2>'],
    ['<blockquote><p>Анна</p></blockquote>'],
    ['<p><q>Анна</q></p>'],
    ['<p><a href="/x">Анна</a></p>'],
  ])('не ставит ссылку внутри %s', (html) => {
    expect(linkHtml(html, session(heroes))).toBe(html);
  });

  it('после закрытия заголовка ссылка снова возможна', () => {
    expect(linkHtml('<h2>Анна</h2><p>Анна</p>', session(heroes))).toBe(
      '<h2>Анна</h2><p><a href="/ru/book/b/wiki/anna">Анна</a></p>'
    );
  });

  it('первая встреча - одна на все вызовы страницы', () => {
    const s = session(heroes);
    linkHtml('<p>Анна</p>', s);
    expect(linkHtml('<p>Анна</p>', s)).toBe('<p>Анна</p>');
  });

  it('снятая страница: форм нет - ссылок нет', () => {
    expect(linkHtml('<p>Анна</p>', session([]))).toBe('<p>Анна</p>');
  });
});

/**
 * Общая фикстура свёртки форм с бэкендом (F08-5b, batches.md §F08-5): та же таблица - в
 * `books/src/modules/book-world/world-mentions.spec.ts` («общая фикстура свёртки форм с фронтом»).
 * Бэкенд проверяет `publicMentionForms` -> `forms` и `mentionForms` -> `folded`; здесь - что копия
 * `foldMention` по `forms` даёт тот же `folded`. Меняешь свёртку - правь таблицу на обеих сторонах.
 */
const SHARED_FOLD_FIXTURE: {
  key: string;
  forms: string[];
  folded: string[];
  searchable?: false;
}[] = [
  {
    key: 'anna',
    forms: ['Анна Каренина', 'Анны', 'Анна'],
    folded: ['анна каренина', 'анны', 'анна'],
  },
  { key: 'petr', forms: ['Пётр', 'Петра'], folded: ['петр', 'петра'] },
  {
    key: 'ship',
    forms: ['«Наутилус»', 'О’Брайен', 'Анна  Каренина'],
    folded: ['"наутилус"', "о'брайен", 'анна каренина'],
  },
  {
    key: 'quotes',
    forms: ['“Ковчег”', '„Ладья‟', '‘Ли‚ Бо‛', 'Анна\u00a0Ли'],
    folded: ['"ковчег"', '"ладья"', "'ли' бо'", 'анна ли'],
  },
  { key: 'yo', forms: ['ЁЖИК', 'Але\u0308на'], folded: ['ежик', 'алена'] },
  { key: 'noname', forms: ['Безымянный'], folded: ['безымянный'] },
  // Нижний регистр всей строки, как у бэкенда: İ -> i + U+0307, конечная Σ -> ς. Поиск по тексту
  // сохраняет длину и такие формы не находит - ссылка пропущена, а не ложная (§11 п.6).
  {
    key: 'case',
    forms: ['İstanbul', 'ΟΔΟΣ'],
    folded: ['i\u0307stanbul', 'οδος'],
    searchable: false,
  },
];

describe('foldMention: общая фикстура с бэкендом (F08-5b)', () => {
  it.each(SHARED_FOLD_FIXTURE.map((row) => [row.key, row] as const))('%s', (_key, row) => {
    expect(row.forms.map(foldMention)).toEqual(row.folded);
  });

  it('поиск по тексту сворачивает так же и не меняет длину', () => {
    for (const row of SHARED_FOLD_FIXTURE.filter((r) => r.searchable !== false)) {
      for (const form of row.forms) {
        const nfc = form.normalize('NFC');
        expect(foldKeepingLength(nfc)).toHaveLength(nfc.length);
        expect(foldKeepingLength(nfc).replace(/\s+/g, ' ').trim()).toBe(foldMention(form));
      }
    }
  });

  // Решение арбитра `F08 | F08-5b` Q12: общая длинная форма занимает своё место в тексте, и своя
  // короткая «Анна» внутри неё ссылкой не становится (раньше становилась - ссылка на догадку).
  it('форма двух сущностей фикстуры («анна каренина») ссылкой не становится и места не отдаёт', () => {
    const s = session(SHARED_FOLD_FIXTURE.map((row) => entity(row.key, row.forms)));
    expect(kinds('Анна Каренина и Анны', s)).toEqual(['Анна Каренина и ', '[entity:Анны]']);
  });
});

describe('linkHtml: разметка вне ссылок не меняется (снимок до и после)', () => {
  const heroes = [entity('anna', ['Анна']), entity('petr', ['Пётр']), entity('jose', ['José'])];
  const stripLinks = (html: string) => html.replace(/<a href="[^"]*">([\s\S]*?)<\/a>/g, '$1');

  it('пересказ с сущностями: без <a> вывод равен входу побайтно', () => {
    const html =
      '<h2>Анна</h2><p>Утро&nbsp;&laquo;тихое&raquo;. Анна&shy;&#8217;s &eacute;t&eacute; &copy; Пётр&amp;Ко.</p>' +
      '<ul><li>Пётр ждёт</li></ul><p>José пришёл</p>';
    const out = linkHtml(html, session(heroes));
    expect(out).toContain('<a href="/ru/book/b/wiki/anna">Анна</a>&shy;');
    expect(out).toContain('<a href="/ru/book/b/wiki/petr">Пётр</a>&amp;Ко');
    expect(stripLinks(out)).toBe(html);
  });

  it('цитата, разбитая тегом, остаётся цитатой; блочный тег сбрасывает незакрытую кавычку', () => {
    const s = session(heroes);
    expect(linkHtml('<p>«Слова <em>Анна</em> сказала»</p>', s)).toBe(
      '<p>«Слова <em>Анна</em> сказала»</p>'
    );
    expect(linkHtml('<p>«не закрыта</p><p>Анна</p>', s)).toBe(
      '<p>«не закрыта</p><p><a href="/ru/book/b/wiki/anna">Анна</a></p>'
    );
  });

  it('знак над буквой после формы - это продолжение слова, ссылки нет', () => {
    expect(kinds('Анна́ пришла', session(heroes))).toEqual(['Анна́ пришла']);
  });

  it('текст в разложенном виде (NFD) находит составную форму', () => {
    const nfd = 'José'.normalize('NFD');
    expect(kinds(`и ${nfd}`, session(heroes))).toEqual(['и ', `[entity:${nfd}]`]);
  });

  it('по умолчанию не больше 15 ссылок на страницу на все вызовы', () => {
    expect(LINK_ENTITIES_PAGE_LIMIT).toBe(15);
    const many = Array.from({ length: 16 }, (_, i) =>
      entity(`k${i}`, [`Герой${'а'.repeat(i + 1)}`])
    );
    const s = createLinkSession(buildLinkIndex(many, hrefOf));
    // Два вызова по границе абзаца: восемь и восемь целых абзацев.
    const paragraphs = many.map((e) => `<p>${e.forms![0]}</p>`);
    const first = linkHtml(paragraphs.slice(0, 8).join(''), s);
    const second = linkHtml(paragraphs.slice(8).join(''), s);
    expect(first.match(/<a /g)).toHaveLength(8);
    expect(second.match(/<a /g)).toHaveLength(7);
    // 16-я сущность осталась текстом.
    expect(second.endsWith(`<p>${many[15].forms![0]}</p>`)).toBe(true);
  });

  it('строка редактора ссылок не получает', () => {
    const s = session([entity('x', ['Борис'], { editor: {} as never })]);
    expect(kinds('Борис', s)).toEqual(['Борис']);
  });
});

describe('регистр упоминания (решение арбитра F08 | F08-5b Q11)', () => {
  const s = () => session([entity('hope', ['Hope']), entity('rose', ['rose garden'])]);

  it('форма с заглавной: «hope» без ссылки, «Hope» со ссылкой', () => {
    expect(kinds('we hope that Hope', s())).toEqual(['we hope that ', '[entity:Hope]']);
  });

  it('ВСЕ ЗАГЛАВНЫЕ - тоже заглавная первая буква', () => {
    expect(kinds('HOPE', s())).toEqual(['[entity:HOPE]']);
  });

  it('форма со строчной первой буквой ищется без учёта регистра', () => {
    expect(kinds('the Rose Garden', s())).toEqual(['the ', '[entity:Rose Garden]']);
  });
});

describe('F08-5b круг 2: сущности, кавычки, снятие, ё', () => {
  const heroes = [entity('anna', ['Анна']), entity('dart', ["D'Artagnan"])];

  it('десятичная числовая сущность раскодируется: имя с &#39; находится, &#171; открывает цитату', () => {
    expect(linkHtml('<p>D&#39;Artagnan ждёт</p>', session(heroes))).toBe(
      '<p><a href="/ru/book/b/wiki/dart">D&#39;Artagnan</a> ждёт</p>'
    );
    expect(linkHtml('<p>&#171;Анна ушла&#187; и всё</p>', session(heroes))).toBe(
      '<p>&#171;Анна ушла&#187; и всё</p>'
    );
    expect(linkHtml('<p>&#1040;нна пришла</p>', session(heroes))).toBe(
      '<p><a href="/ru/book/b/wiki/anna">&#1040;нна</a> пришла</p>'
    );
  });

  it.each([['“Анна ушла”'], ['„Анна ушла“'], ['"Анна ушла"']])(
    'цитата в кавычках %s ссылок не получает',
    (quoted) => {
      expect(kinds(`Он сказал: ${quoted}.`, session(heroes))).toEqual([`Он сказал: ${quoted}.`]);
    }
  );

  it('непарная прямая кавычка не глушит имя после неё', () => {
    expect(kinds('Рост 6" и Анна', session(heroes))).toEqual(['Рост 6" и ', '[entity:Анна]']);
  });

  it.each([['<p><cite>Анна</cite></p>'], ['<h3>Анна</h3>'], ['<h6>Анна</h6>'], ['<h1>Анна</h1>']])(
    'не ставит ссылку внутри %s',
    (html) => {
      expect(linkHtml(html, session(heroes))).toBe(html);
    }
  );

  it('снятие страницы: тот же текст - ссылка, пока сущность в списке, и текст, когда её убрали', () => {
    const text = '<p>Анна пришла</p>';
    expect(linkHtml(text, session(heroes))).toContain('<a href="/ru/book/b/wiki/anna">');
    expect(linkHtml(text, session([heroes[1]]))).toBe(text);
    expect(linkHtml(text, session([{ ...heroes[0], hasCore: false }, heroes[1]]))).toBe(text);
  });

  it('ё в разложенном виде (NFD) находит форму с ё и с е', () => {
    const s = session([entity('alena', ['Алёна'])]);
    const nfd = 'Але\u0308на';
    expect(kinds(`и ${nfd}`, s)).toEqual(['и ', `[entity:${nfd}]`]);
    expect(kinds('и Алена', session([entity('alena', ['Алёна'])]))).toEqual([
      'и ',
      '[entity:Алена]',
    ]);
  });

  it('markLinked: имя сущности, уже стоящей ссылкой (заголовок карточки), текстом и без траты слота', () => {
    const s = session(heroes, { limit: 1 });
    markLinked(s, 'anna');
    expect(kinds("Анна и D'Artagnan", s)).toEqual(['Анна и ', "[entity:D'Artagnan]"]);
  });
});

describe('F08-5b круг 3: владельцы формы, тип, кавычки через тег (решения арбитра Q12, Q3)', () => {
  it('длинная форма сущности без страницы занимает место: короткая чужая внутри неё не ссылка', () => {
    const s = session([
      entity('bolk', ['Мария Болконская'], { hasCore: false }),
      entity('rost', ['Мария']),
    ]);
    expect(kinds('Мария Болконская вошла', s)).toEqual(['Мария Болконская вошла']);
    expect(kinds('Мария вошла', s)).toEqual(['[entity:Мария]', ' вошла']);
  });

  it('форма у сущности со страницей и у сущности без страницы - без ссылки', () => {
    const s = session([entity('a', ['Анна']), entity('b', ['Анна'], { hasCore: false })]);
    expect(kinds('Анна пришла', s)).toEqual(['Анна пришла']);
  });

  it('формы нет (бэкенд не отдал или пусто) - ссылки нет (§11 п.6)', () => {
    const s = session([
      entity('a', [], { name: 'Анна' }),
      { ...entity('b', []), forms: undefined },
    ]);
    expect(kinds('Анна и b', s)).toEqual(['Анна и b']);
  });

  it('entityHrefByName: имя героя совпало с формой места - для героя ссылки нет; тёзка любого типа - нет', () => {
    const index = buildLinkIndex(
      [
        entity('hope', ['Hope'], { type: 'place' }),
        entity('anna', ['Анна']),
        entity('anna-place', ['Анна'], { type: 'place' }),
        entity('petr', ['Пётр']),
      ],
      hrefOf
    );
    expect(entityHrefByName(index, 'Hope', 'character')).toBeNull();
    expect(entityHrefByName(index, 'Hope')).toBe('/ru/book/b/wiki/hope');
    expect(entityHrefByName(index, 'Анна', 'character')).toBeNull();
    expect(entityHrefByName(index, 'Петр', 'character')).toBe('/ru/book/b/wiki/petr');
  });

  it('entityTargetByName: символ -> предмет - ключ и адрес только у единственного владельца-предмета (F08-13d, Q2)', () => {
    const index = buildLinkIndex(
      [
        entity('skull', ['Череп Йорика'], { type: 'object' }),
        entity('ring', ['Кольцо'], { type: 'object' }),
        entity('ring-place', ['Кольцо'], { type: 'place' }),
        entity('hope', ['Надежда']),
      ],
      hrefOf
    );
    expect(entityTargetByName(index, 'череп йорика', 'object')).toMatchObject({
      key: 'skull',
      href: '/ru/book/b/wiki/skull',
    });
    expect(entityTargetByName(index, 'Кольцо', 'object')).toBeNull();
    expect(entityTargetByName(index, 'Надежда', 'object')).toBeNull();
    expect(entityTargetByName(index, 'Надежда')?.key).toBe('hope');
    expect(entityTargetByName(index, 'Корона', 'object')).toBeNull();
    expect(entityTargetByName(index, 'Корона')).toBeNull();
  });

  it('прямая кавычка, закрытая в следующем текстовом узле абзаца, - цитата', () => {
    const s = session([entity('anna', ['Анна'])]);
    const html = '<p>"слова <em>Анна</em> были" и всё</p>';
    expect(linkHtml(html, s)).toBe(html);
    // В следующем абзаце пары нет - не цитата.
    expect(linkHtml('<p>рост 6"</p><p>Анна</p>', session([entity('anna', ['Анна'])]))).toBe(
      '<p>рост 6"</p><p><a href="/ru/book/b/wiki/anna">Анна</a></p>'
    );
  });
});

describe('F08-5b круг 4: сущность без форм - помеха своему имени', () => {
  it('чужая форма с тем же именем ссылки не даёт, сама сущность без форм ссылку не получает', () => {
    const s = session([
      { ...entity('maria-a', []), name: 'Мария' },
      { ...entity('maria-x', ['Мария'], { hasCore: true }) },
      { ...entity('boris', []), forms: undefined, name: 'Борис' },
    ]);
    expect(kinds('Мария и Борис', s)).toEqual(['Мария и Борис']);
  });

  it('без тёзки форма другой сущности по-прежнему ссылка', () => {
    const s = session([{ ...entity('a', []), name: 'Ольга' }, entity('maria', ['Мария'])]);
    expect(kinds('Мария и Ольга', s)).toEqual(['[entity:Мария]', ' и Ольга']);
  });
});

describe('F08-5b круг 5: непарные кавычки, код, закрытие внутри ссылки', () => {
  it('непарная «ёлочка» и “лапка” не глушат имя после них', () => {
    expect(kinds('«начало и Анна', session([entity('anna', ['Анна'])]))).toEqual([
      '«начало и ',
      '[entity:Анна]',
    ]);
    expect(kinds('„начало и Анна', session([entity('anna', ['Анна'])]))).toEqual([
      '„начало и ',
      '[entity:Анна]',
    ]);
    expect(kinds('«слова Анна»', session([entity('anna', ['Анна'])]))).toEqual(['«слова Анна»']);
  });

  it('code и pre ссылок не получают', () => {
    const s = session([entity('anna', ['Анна'])]);
    const html = '<p><code>Анна</code></p><pre>Анна</pre>';
    expect(linkHtml(html, s)).toBe(html);
    expect(s.used.size).toBe(0);
  });

  it('закрывающая кавычка внутри ссылки закрывает цитату абзаца', () => {
    const s = session([entity('anna', ['Анна'])]);
    expect(linkHtml('<p>«слова <a href="/x">тут»</a> и Анна</p>', s)).toBe(
      '<p>«слова <a href="/x">тут»</a> и <a href="/ru/book/b/wiki/anna">Анна</a></p>'
    );
  });
});

describe('пара героев не цель перелинковки (F08-8c)', () => {
  const anna = entity('anna', ['Анна']);
  const petr = entity('petr', ['Пётр']);
  // Бэкенд формы пары не отдаёт (`forms: []`), но имя «Анна и Пётр» всё равно не должно мешать.
  const pair = entity('anna--petr', [], { type: 'pair', name: 'Анна и Пётр' });
  const withForms = entity('anna--petr', ['Анна и Пётр'], { type: 'pair', name: 'Анна и Пётр' });

  it('имена героев внутри имени пары в тексте остаются ссылками на героев', () => {
    for (const p of [pair, withForms]) {
      const s = createLinkSession(buildLinkIndex([anna, petr, p], hrefOf));
      expect(linkText('Анна и Пётр шли вместе.', s).map((x) => x.kind)).toEqual([
        'entity',
        'text',
        'entity',
        'text',
      ]);
    }
  });

  it('страницы пары нет ни среди целей по имени, ни среди карточек героев', () => {
    const index = buildLinkIndex([anna, petr, withForms], hrefOf);
    expect(index.byForm.has(foldMention('Анна и Пётр'))).toBe(false);
    expect(index.pageHref.has('anna--petr')).toBe(false);
    expect(entityHrefByName(index, 'Анна и Пётр', 'character')).toBeNull();
  });
});
