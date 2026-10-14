import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LegalPage } from '@/components/public/legal/LegalPage';
import { getLegalDocument } from '@/content/legal';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/en/privacy',
}));

/**
 * Privacy и terms после F01-6 (`product.md` §10, §11): разделы по спецификации и в её порядке,
 * оглавление, таблица «цель - основание - данные». Порядок якорей во всех языках сверяет тест паритета.
 */
const PRIVACY_SECTIONS = [
  'who',
  'data',
  'purposes',
  'recipients',
  'transfers',
  'retention',
  'rights',
  'regions',
  'children',
  'cookies',
  'security',
  'changes',
];
const TERMS_SECTIONS = [
  'operator',
  'service',
  'account',
  'use',
  'content',
  'comments',
  'availability',
  'rights-holders',
  'liability',
  'law',
  'changes',
  'contact',
];

const ids = (page: 'privacy' | 'terms') =>
  getLegalDocument(page, 'en').sections.map((section) => section.id);

const sectionText = (page: 'privacy' | 'terms', lang: string, id: string) =>
  JSON.stringify(getLegalDocument(page, lang).sections.find((section) => section.id === id));

describe('privacy и terms (F01-6)', () => {
  it('privacy: двенадцать разделов по product.md §10, с оглавлением', () => {
    expect(ids('privacy')).toEqual(PRIVACY_SECTIONS);
    expect(getLegalDocument('privacy', 'en').toc).toBe(true);
  });

  it('terms: двенадцать разделов по product.md §11, с оглавлением', () => {
    expect(ids('terms')).toEqual(TERMS_SECTIONS);
    expect(getLegalDocument('terms', 'en').toc).toBe(true);
  });

  it('privacy: таблица «цель - основание - данные» рисуется таблицей с подписями ячеек', () => {
    render(<LegalPage document={getLegalDocument('privacy', 'en')} />);

    const table = screen.getByRole('table');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent)
    ).toEqual(['Purpose', 'Legal basis', 'Data']);
    const firstRow = within(table).getAllByRole('row')[1];
    expect(
      within(firstRow)
        .getAllByRole('cell')
        .map((td) => td.dataset.label)
    ).toEqual(['Purpose', 'Legal basis', 'Data']);
  });

  it('terms/ru: доступность по странам - ровно утверждённая фраза (product.md §1, D6)', () => {
    const availability = getLegalDocument('terms', 'ru').sections.find(
      (section) => section.id === 'availability'
    );
    expect(availability?.blocks).toEqual([
      {
        kind: 'paragraph',
        content: [{ kind: 'text', text: 'Книга может быть недоступна в некоторых странах.' }],
      },
    ]);
  });

  it.each(SUPPORTED_LANGS)(
    '%s: в privacy нет Sentry, почтового сервиса и раздела про 152-ФЗ (owner-facts, D7)',
    (lang) => {
      const text = JSON.stringify(getLegalDocument('privacy', lang));
      expect(text).not.toMatch(/sentry|152-ФЗ|152-FZ|Роскомнадзор/i);
    }
  );

  it.each(SUPPORTED_LANGS)(
    '%s: передача за рубеж - «надлежащие гарантии» (ст. 45/46), без названия механизма (решения арбитра 14.10.2026)',
    (lang) => {
      const transfers = sectionText('privacy', lang, 'transfers');
      expect(transfers).toMatch(
        /(Articles|artículos|articles|artigos|статьи) 45 (and|y|et|e|и) 46/
      );
      // DPF и стандартные договорные условия не названы ни для одного обработчика, на всех языках.
      expect(transfers).not.toMatch(
        /Privacy Framework|Privacidad de Datos|protection des données UE|DPF|SCC|contractual clauses|cláusulas contractuales|clauses contractuelles|cláusulas contratuais|договорн/i
      );
      const recipients = sectionText('privacy', lang, 'recipients');
      for (const company of ['Namecheap, Inc.', 'Cloudflare', 'Google']) {
        expect(recipients).toContain(company);
      }
    }
  );

  it('an unknown language falls back to the default document, as the dictionaries did', () => {
    expect(getLegalDocument('privacy', 'xx')).toBe(getLegalDocument('privacy', 'en'));
    expect(getLegalDocument('terms', 'de')).toBe(getLegalDocument('terms', 'en'));
    expect(getLegalDocument('legal-notice', 'de')).toBe(getLegalDocument('legal-notice', 'en'));
  });
});
