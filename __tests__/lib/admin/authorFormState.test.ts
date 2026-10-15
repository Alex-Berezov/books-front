import { describe, expect, it } from 'vitest';
import {
  applyPhotoChange,
  emptyAuthorForm,
  factsFromForm,
  factsToForm,
  isEmptyBlockValue,
  photoCreditFromForm,
  translationToForm,
} from '@/lib/admin/author-form-state';
import { applyBlockText } from '@/lib/admin/author-validation';

describe('applyPhotoChange (решение арбитра В6)', () => {
  it('og, равный прежнему портрету (копия старого поведения), очищается', () => {
    const { translations } = emptyAuthorForm();
    translations.en.photoUrl = 'https://cdn.example.org/old.jpg';
    translations.en.seo = { ...translations.en.seo, ogImageUrl: 'https://cdn.example.org/old.jpg' };

    const next = applyPhotoChange(translations, 'https://cdn.example.org/new.jpg');

    expect(next.en.photoUrl).toBe('https://cdn.example.org/new.jpg');
    expect(next.en.seo.ogImageUrl).toBe('');
    expect(next.ru.photoUrl).toBe('https://cdn.example.org/new.jpg');
  });

  it('выставленный вручную og не трогается и портрет туда не копируется', () => {
    const { translations } = emptyAuthorForm();
    translations.en.photoUrl = 'https://cdn.example.org/old.jpg';
    translations.en.seo = { ...translations.en.seo, ogImageUrl: 'https://cdn.example.org/og.jpg' };

    const next = applyPhotoChange(translations, 'https://cdn.example.org/new.jpg');

    expect(next.en.seo.ogImageUrl).toBe('https://cdn.example.org/og.jpg');
    expect(next.es.seo.ogImageUrl).toBeUndefined();
  });
});

describe('applyBlockText: JSON-редактор блока', () => {
  it('ошибка разбора не даёт значения — прежнее значение блока не затирается', () => {
    const result = applyBlockText('quotes', '[{"text": "a"', 'en');

    expect(result).toEqual({ issues: [{ lang: 'en', path: 'quotes', reason: 'invalidJson' }] });
    expect('value' in result).toBe(false);
  });

  it('ошибка формы — с путём', () => {
    const result = applyBlockText(
      'funFacts',
      '[{"text":"x","sourceTitle":"y","sourceUrl":"z"}]',
      'ru'
    );

    expect(result.issues).toEqual([{ lang: 'ru', path: 'funFacts[0].sourceUrl', reason: 'url' }]);
  });

  it('пустое поле и [] — блока нет', () => {
    expect(applyBlockText('awards', '  ', 'en')).toEqual({ issues: null, value: null });
    expect(applyBlockText('awards', '[]', 'en')).toEqual({ issues: null, value: null });
  });

  it('правка одной цитаты сохраняет остальные', () => {
    const text = JSON.stringify([
      { text: 'first', source: 'A' },
      { text: 'second (edited)', source: 'B', bookSlug: 'b' },
      { text: 'third' },
    ]);

    expect(applyBlockText('quotes', text, 'en')).toEqual({
      issues: null,
      value: [
        { text: 'first', source: 'A' },
        { text: 'second (edited)', source: 'B', bookSlug: 'b' },
        { text: 'third' },
      ],
    });
  });
});

describe('translationToForm: старый автор', () => {
  it('только биография, цитаты без bookSlug и faq — открывается без ошибок', () => {
    const form = translationToForm({
      language: 'en',
      name: 'Oscar Wilde',
      slug: 'oscar-wilde',
      biography: '<p>Bio</p>',
      quotes: [
        { text: 'Be yourself', source: '' },
        { text: '', source: 'empty quote is dropped as before' },
      ],
      faq: [{ question: 'Q', answer: 'A' }],
      seo: null,
    });

    expect(Object.values(form.drafts).every((d) => d.issues === null)).toBe(true);
    expect(form.blocks.quotes).toEqual([{ text: 'Be yourself', source: '' }]);
    // Тот же текст редактора проходит проверку, которую сохранение делает перед отправкой.
    expect(applyBlockText('quotes', form.drafts.quotes.text, 'en')).toEqual({
      issues: null,
      value: [{ text: 'Be yourself' }],
    });
    expect(form.blocks.awards).toBeNull();
    expect(form.drafts.awards.text).toBe('');
    expect(form.faq).toEqual([{ question: 'Q', answer: 'A' }]);
    expect(form.tagline).toBe('');
  });

  it('данные, не проходящие схему, остаются как есть и ловятся проверкой текста редактора', () => {
    const form = translationToForm({
      language: 'ru',
      name: 'X',
      slug: 'x',
      funFacts: [{ text: 't', sourceTitle: 's', sourceUrl: 'not-a-url' }],
    });

    expect(form.blocks.funFacts).toEqual([{ text: 't', sourceTitle: 's', sourceUrl: 'not-a-url' }]);
    expect(applyBlockText('funFacts', form.drafts.funFacts.text, 'ru').issues).toEqual([
      { lang: 'ru', path: 'funFacts[0].sourceUrl', reason: 'url' },
    ]);
  });
});

describe('поля фактов и подписи портрета', () => {
  it('факты из полей: списки массивом, пустое — null', () => {
    const form = emptyAuthorForm().translations.en.facts;

    expect(factsFromForm(form)).toBeNull();
    expect(
      factsFromForm({
        ...form,
        gender: 'female',
        genres: ['novel', ' ', ' poem '],
        birthPlace: ' Paris ',
      })
    ).toEqual({ gender: 'female', genres: ['novel', 'poem'], birthPlace: 'Paris' });
  });

  it('элемент списка с запятой не распадается — ни при открытии, ни при сохранении', () => {
    const place = 'Yasnaya Polyana, Russian Empire';
    const form = factsToForm({ languages: ['Russian', 'French'], pseudonyms: [place] });

    expect(form.pseudonyms).toEqual([place]);
    expect(factsFromForm(form)).toEqual({ languages: ['Russian', 'French'], pseudonyms: [place] });
  });

  it('isEmptyBlockValue: пустое — null, [], объект из пустых списков; иначе нет', () => {
    expect(isEmptyBlockValue(null)).toBe(true);
    expect(isEmptyBlockValue([])).toBe(true);
    expect(isEmptyBlockValue({ influencedBy: [], influenced: [] })).toBe(true);
    expect(isEmptyBlockValue([{ text: 'q' }])).toBe(false);
    expect(isEmptyBlockValue({ influencedBy: [{ name: 'A' }], influenced: [] })).toBe(false);
  });

  it('подпись из четырёх пустых полей — null, пустые ссылки не отправляются', () => {
    const empty = emptyAuthorForm().general.photoCredit;

    expect(photoCreditFromForm(empty)).toBeNull();
    expect(photoCreditFromForm({ ...empty, author: 'A', license: 'CC BY-SA 4.0' })).toEqual({
      author: 'A',
      license: 'CC BY-SA 4.0',
    });
  });
});
