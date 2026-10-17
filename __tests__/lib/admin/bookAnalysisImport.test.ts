import { describe, expect, it } from 'vitest';
import {
  analysisRequestFromForm,
  collectClearedBlocks,
  formFromAnalysis,
  hasDraftIssues,
  mergeAnalysisImport,
} from '@/lib/admin/book-analysis-form-state';
import { buildAnalysisPromptInputsText } from '@/lib/admin/book-analysis-prompt-inputs';
import {
  analyzeBookAnalysisImport,
  applyListText,
  checkBookAnalysisImport,
} from '@/lib/admin/book-analysis-validation';
import type { BookAnalysisDetail, SaveBookAnalysisRequest } from '@/types/api-schema';
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
