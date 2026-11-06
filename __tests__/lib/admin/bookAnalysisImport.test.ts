import { describe, expect, it } from 'vitest';
import {
  analysisRequestFromForm,
  collectClearedBlocks,
  collectReplacedBlocks,
  formFromAnalysis,
  hasDraftIssues,
  mergeAnalysisImport,
  takeServerBlocks,
} from '@/lib/admin/book-analysis-form-state';
import {
  buildAnalysisPromptInputsText,
  promptMotifsFromDossier,
} from '@/lib/admin/book-analysis-prompt-inputs';
import {
  analyzeBookAnalysisImport,
  applyListText,
  checkBookAnalysisImport,
} from '@/lib/admin/book-analysis-validation';
import type {
  BookAnalysisDetail,
  DossierStatus,
  SaveBookAnalysisRequest,
} from '@/types/api-schema';
import en from '../../fixtures/example-analysis.en.json';
import es from '../../fixtures/example-analysis.es.json';
import fr from '../../fixtures/example-analysis.fr.json';
import pt from '../../fixtures/example-analysis.pt.json';
import ru from '../../fixtures/example-analysis.ru.json';

/**
 * F03-1: импорт анализа в админке (`product.md` §21 п.3, `tech.md` §3 и T6; решения арбитра А4, А7).
 * Эталон — побайтовая копия `books-app-docs/features/F03-book-analysis/prompts/example-analysis.*.json`.
 */

const EXAMPLES = { en, es, fr, pt, ru } as const;

const paths = (input: unknown, lang = 'en') =>
  checkBookAnalysisImport(structuredClone(input), lang).errors.map((e) => e.path);

describe('checkBookAnalysisImport', () => {
  it.each(Object.entries(EXAMPLES))('эталон %s проходит на версии своего языка', (lang, json) => {
    const res = checkBookAnalysisImport(structuredClone(json), lang);
    expect(res.errors).toEqual([]);
    expect(res.data?.language).toBe(lang);
  });

  it('язык JSON не совпал с языком версии — отказ по `language`', () => {
    expect(paths(en, 'ru')).toEqual(['language']);
  });

  it('испорченный эталон — ошибки по пути поля', () => {
    const broken = structuredClone(en) as Record<string, unknown> & {
      characters: Record<string, unknown>[];
      timeline: Record<string, unknown>[];
      keyQuotes: Record<string, unknown>[];
      sources: Record<string, unknown>[];
      themes: Record<string, unknown>[];
    };
    broken.characters[0]!.role = 'hero';
    broken.timeline[0]!.kind = 'war';
    broken.keyQuotes[0]!.chapter = 0;
    broken.sources[0]!.url = 'http://example.com';
    broken.themes[0]!.key = 'Bad Key';
    expect(paths(broken).sort()).toEqual(
      [
        'characters.0.role',
        'keyQuotes.0.chapter',
        'sources.0.url',
        'themes.0.key',
        'timeline.0.kind',
      ].sort()
    );
  });

  it('неизвестный ключ — ошибка с путём, на любом уровне', () => {
    expect(paths({ language: 'en', unknownBlock: 1 })).toEqual(['unknownBlock']);
    expect(paths({ language: 'en', themes: [{ key: 'a', title: 'A', extra: 1 }] })).toEqual([
      'themes.0.extra',
    ]);
  });

  it('лимит цитат у темы — 3 (А11), название из пробелов — пусто', () => {
    const quotes = [1, 2, 3, 4].map((n) => ({ text: `q${n}` }));
    expect(paths({ language: 'en', themes: [{ key: 'a', title: 'A', quotes }] })).toEqual([
      'themes.0.quotes',
    ]);
    expect(paths({ language: 'en', themes: [{ key: 'a', title: '   ' }] })).toEqual([
      'themes.0.title',
    ]);
  });

  it('`null`, `""` и `[]` у блока верхнего уровня — допустимы (очистка)', () => {
    expect(paths({ language: 'en', themes: null, mainIdea: '', symbols: [] })).toEqual([]);
  });
});

const saved = (): BookAnalysisDetail => ({
  ...(structuredClone(en) as unknown as BookAnalysisDetail),
  hasCore: true,
  createdAt: '2026-10-17T00:00:00.000Z',
  updatedAt: '2026-10-17T00:00:00.000Z',
});

describe('слияние импорта с формой (T6)', () => {
  it('ключа нет — блок прежний; `null` очищает; список заменяется целиком', () => {
    const prev = formFromAnalysis(saved());
    const data = {
      language: 'en',
      titleMeaning: null,
      symbols: [{ title: 'Yellow', interpretation: 'Y.' }],
    } as SaveBookAnalysisRequest;
    const next = mergeAnalysisImport(prev, data);
    expect(next.texts.mainIdea).toBe(prev.texts.mainIdea);
    expect(next.lists.themes).toEqual(prev.lists.themes);
    expect(next.texts.titleMeaning).toBe('');
    expect(next.lists.symbols).toEqual([{ title: 'Yellow', interpretation: 'Y.' }]);
    expect(next.drafts.symbols.text).toContain('Yellow');
    expect(collectClearedBlocks(prev, data)).toEqual(['titleMeaning']);
  });

  it('сохранение шлёт всю запись: все ключи, пустые — `null` (А4)', () => {
    const body = analysisRequestFromForm(formFromAnalysis(null), 'ru');
    expect(body.language).toBe('ru');
    expect(Object.keys(body).sort()).toEqual(
      [
        'language',
        'facts',
        'mainIdea',
        'titleMeaning',
        'endingMeaning',
        'context',
        'reception',
        'themes',
        'characters',
        'symbols',
        'keyQuotes',
        'timeline',
        'style',
        'adaptations',
        'misreadings',
        'discussionQuestions',
        'faq',
        'sources',
      ].sort()
    );
    expect(Object.values(body).filter((v) => v !== null)).toEqual(['ru']);
  });

  it('эталон через форму возвращается тем же телом', () => {
    const body = analysisRequestFromForm(formFromAnalysis(saved()), 'en');
    const { language: _l, ...blocks } = body;
    const { language: _e, ...expected } = en as Record<string, unknown>;
    expect(blocks).toEqual(expected);
  });

  it('окно импорта: разбор, ошибки JSON и очищаемые блоки', () => {
    const prev = formFromAnalysis(saved());
    expect(analyzeBookAnalysisImport(prev, '{', 'en').errors).toEqual([
      { path: '', message: 'invalid JSON' },
    ]);
    const res = analyzeBookAnalysisImport(prev, '{"language":"en","faq":null}', 'en');
    expect(res.errors).toEqual([]);
    expect(res.cleared).toEqual(['faq']);
  });
});

describe('JSON-редактор списка', () => {
  it('ошибка формы держит прежнее значение и стопорит сохранение', () => {
    const res = applyListText('timeline', '[{"year":"1866","event":"E","kind":"war"}]');
    expect(res.issues?.map((i) => i.path)).toEqual(['timeline.0.kind']);
    const form = formFromAnalysis(null);
    form.drafts.timeline = { text: 'x', issues: res.issues };
    expect(hasDraftIssues(form)).toBe(true);
  });

  it('пустой текст, `null` и `[]` — блока нет', () => {
    for (const text of ['', 'null', '[]']) {
      expect(applyListText('faq', text)).toEqual({ issues: null, value: null });
    }
  });
});

describe('«Вводные для промпта» (§21 п.2)', () => {
  it('название, автор, язык, год, главы «номер — название», персонажи и цитаты', () => {
    const text = buildAnalysisPromptInputsText(
      {
        title: 'Crime and Punishment',
        author: 'Fyodor Dostoevsky',
        language: 'en',
        firstPublishedYear: 1866,
        characters: [{ name: 'Raskolnikov', description: 'A student' }],
        quotes: [{ text: 'Pain and suffering…' }],
      },
      [
        { number: 1, title: 'Part I, Chapter 1' },
        { number: 2, title: 'Part I, Chapter 2' },
      ],
      2
    );
    expect(text).toContain('Crime and Punishment');
    expect(text).toContain('Fyodor Dostoevsky');
    expect(text).toContain('\nen\n');
    expect(text).toContain('1866');
    expect(text).toContain('1 — Part I, Chapter 1\n2 — Part I, Chapter 2');
    expect(text).toContain('- Raskolnikov — A student');
    expect(text).toContain('- Pain and suffering…');
  });

  it('без глав и без персонажей — явное «нет», а не пустота', () => {
    const text = buildAnalysisPromptInputsText(
      {
        title: 'T',
        author: 'A',
        language: 'ru',
        firstPublishedYear: null,
        characters: null,
        quotes: [],
      },
      [],
      0
    );
    expect(text).toContain('глав нет');
    expect(text).toContain('Год первой публикации:\nне указан');
    expect(text.match(/\nнет(\n|$)/g)).toHaveLength(2);
  });
});

describe('импорт поверх формы и перечитывание после хода анализа', () => {
  it('окно импорта называет заполненные блоки, которые заменятся, но не нетронутые и не пустые', () => {
    const prev = formFromAnalysis(saved());
    const keyQuotes = [{ text: 'New line', chapter: 1 }];
    const data = { language: 'en', keyQuotes, style: prev.lists.style } as SaveBookAnalysisRequest;
    expect(collectReplacedBlocks(prev, data)).toEqual(['keyQuotes']);
    expect(collectReplacedBlocks(formFromAnalysis(null), data)).toEqual([]);
    const res = analyzeBookAnalysisImport(prev, JSON.stringify(data), 'en');
    expect(res.replaced).toEqual(['keyQuotes']);
    expect(res.cleared).toEqual([]);
    // Тот же список с полями в другом порядке — не замена.
    const reordered = (prev.lists.style ?? []).map((item) =>
      Object.fromEntries(Object.entries(item).reverse())
    );
    const same = { language: 'en', style: reordered } as SaveBookAnalysisRequest;
    expect(analyzeBookAnalysisImport(prev, JSON.stringify(same), 'en').replaced).toEqual([]);
  });

  it('ход записал блоки: форма берёт неправленые с сервера, правленые оставляет и называет (F07-3a)', () => {
    const saved_ = formFromAnalysis(saved());
    const server = formFromAnalysis({
      ...saved(),
      mainIdea: 'Run idea',
      facts: { ...saved().facts, narrator: 'Run narrator', genre: 'Run genre' },
      style: [{ device: 'Run device', explanation: 'Run' }],
    });
    const form = {
      ...saved_,
      facts: { ...saved_.facts, narrator: 'My narrator' },
      drafts: { ...saved_.drafts, keyQuotes: { text: '[]', issues: null } },
    };
    const { form: next, kept } = takeServerBlocks(form, saved_, server);
    expect(next.texts.mainIdea).toBe('Run idea');
    expect(next.facts.genre).toBe('Run genre');
    expect(next.lists.style).toEqual(server.lists.style);
    expect(next.drafts.style.text).toBe(server.drafts.style.text);
    // Правки редактора не затёрты; сервер изменил только narrator — он и назван.
    expect(next.facts.narrator).toBe('My narrator');
    expect(next.drafts.keyQuotes.text).toBe('[]');
    expect(kept).toEqual(['facts.narrator']);
  });

  it('«Вводные»: мотивы досье с главами, язык досье назван, если он не язык версии (Р10)', () => {
    const version = {
      title: 'T',
      author: 'A',
      language: 'fr' as const,
      firstPublishedYear: null,
      characters: null,
      quotes: null,
    };
    const motifs = [
      { image: 'the door', chapters: [2, 5] },
      { image: 'rain', chapters: [] },
    ];
    const text = buildAnalysisPromptInputsText(version, [], 0, {
      motifs,
      dossierLanguage: 'en',
    });
    expect(text).toContain(
      'Сквозные мотивы из досье (язык досье: en):\n- the door — главы 2, 5\n- rain'
    );
    const same = buildAnalysisPromptInputsText(version, [], 0, { motifs, dossierLanguage: 'fr' });
    expect(same).toContain('Сквозные мотивы из досье:\n');
    expect(buildAnalysisPromptInputsText(version, [], 0)).not.toContain('мотивы');
  });
});

describe('JSON с сохранёнными и новыми элементами проходит проверку импорта фронта', () => {
  // Форма `draft.analysis` из e2e бэкенда (`books/test/content-draft.e2e-spec.ts`, анализ на
  // исходнике): сохранённые элементы с описанием и толкованием, новые - без них.
  const draftAnalysis = {
    language: 'en',
    facts: { settingPlace: 'Saved town', settingTime: '1900s' },
    characters: [
      {
        key: 'anna',
        name: 'Anna',
        role: 'main',
        description: 'Saved words',
        arc: { from: 'alone', to: 'at home' },
        quote: { text: 'Anna in chapter 1.', chapter: 1 },
      },
      {
        key: 'boris',
        name: 'Boris',
        role: 'minor',
        relations: [{ to: 'anna', label: 'neighbour' }],
      },
    ],
    keyQuotes: [
      { text: 'Saved quote', interpretation: 'Saved meaning' },
      { text: 'Anna in chapter 2.', chapter: 2, speakerKey: 'anna' },
    ],
    style: [
      { device: 'Repetition', explanation: 'Saved', example: { text: 'Saved', chapter: 1 } },
      { device: 'Irony', explanation: 'How it shows' },
    ],
  };

  it('ошибок нет, ключей вне пяти нет', () => {
    const checked = checkBookAnalysisImport(structuredClone(draftAnalysis), 'en');
    expect(checked.errors).toEqual([]);
    expect(Object.keys(checked.data ?? {}).sort()).toEqual([
      'characters',
      'facts',
      'keyQuotes',
      'language',
      'style',
    ]);
  });

  it('заменятся только заполненные блоки с другим содержимым: facts и тексты тоже', () => {
    const prev = formFromAnalysis(null);
    prev.facts.narrator = 'Saved narrator';
    prev.texts.mainIdea = 'Saved idea';
    const data = {
      language: 'en',
      facts: { settingPlace: 'P' },
      mainIdea: 'Saved idea',
    } as SaveBookAnalysisRequest;
    expect(collectReplacedBlocks(prev, data)).toEqual(['facts']);
    prev.lists.keyQuotes = [{ text: 'Same', chapter: 1 }];
    const same = {
      language: 'en',
      keyQuotes: [{ text: 'Same', chapter: 1, speakerKey: null, interpretation: null }],
    } as SaveBookAnalysisRequest;
    // Пустые поля, которые дописывает проверка, - не замена.
    expect(collectReplacedBlocks(prev, same)).toEqual([]);
  });
});

describe('мотивы досье для «Вводных» (F07-3a, решение арбитра `F07 | F07-3`)', () => {
  const dossier = (patch: Partial<DossierStatus> = {}) =>
    ({
      status: 'ready',
      data: {
        motifs: [
          { image: 'the door', chapters: [1, 2, 9] },
          { image: 'rain', chapters: [] },
        ],
      },
      ...patch,
    }) as DossierStatus;
  const chapters = [
    { number: 1, title: 'One' },
    { number: 2, title: 'Two' },
  ];

  it('только готовое досье и известный язык; главы — только этой версии', () => {
    expect(promptMotifsFromDossier(dossier(), chapters, 2, 'en')).toEqual({
      motifs: [
        { image: 'the door', chapters: [1, 2] },
        { image: 'rain', chapters: [] },
      ],
      dossierLanguage: 'en',
    });
    expect(promptMotifsFromDossier(dossier({ status: 'building' }), chapters, 2, 'en')).toBeNull();
    expect(
      promptMotifsFromDossier(dossier({ status: 'missing', data: null }), chapters, 2, 'en')
    ).toBeNull();
    expect(promptMotifsFromDossier(undefined, chapters, 2, 'en')).toBeNull();
    expect(promptMotifsFromDossier(dossier(), chapters, 2, undefined)).toBeNull();
  });

  it('пустой список глав — главы мотивов отбрасываются, а не пропускаются все', () => {
    expect(promptMotifsFromDossier(dossier(), [], 10, 'en')?.motifs).toEqual([
      { image: 'the door', chapters: [] },
      { image: 'rain', chapters: [] },
    ]);
    expect(promptMotifsFromDossier(dossier(), [], 0, 'en')?.motifs[0].chapters).toEqual([]);
  });

  it('защитные ветки: мотивы не массив, пустой элемент, образ не строка, главы не массив, номер не число', () => {
    const odd = (motifs: unknown) =>
      promptMotifsFromDossier(dossier({ data: { motifs } as never }), chapters, 2, 'en')?.motifs;
    expect(odd('not a list')).toEqual([]);
    expect(odd(null)).toEqual([]);
    expect(
      odd([
        null,
        { image: 7, chapters: [1] },
        { image: 'door', chapters: 'one' },
        { image: 'key', chapters: [1, '2', null, 2] },
      ])
    ).toEqual([
      { image: 'door', chapters: [] },
      { image: 'key', chapters: [1, 2] },
    ]);
  });

  it('список глав урезан пределом ручки — номера после последнего показанного остаются', () => {
    expect(promptMotifsFromDossier(dossier(), chapters, 10, 'en')?.motifs[0].chapters).toEqual([
      1, 2, 9,
    ]);
  });
});
