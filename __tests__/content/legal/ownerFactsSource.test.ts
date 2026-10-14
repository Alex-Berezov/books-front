// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { getLegalDocument } from '@/content/legal';
import { operatorStatusText } from '@/content/legal/operator-status';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import type { LegalDocument, LegalInline, LegalPageId } from '@/content/legal/types';

/**
 * F01-6 (`batches.md`, посадка): каждый факт владельца в правовых текстах приходит из
 * `lib/site/owner-facts.ts`. Константы подменены метками - второе написание адреса, имени или
 * почты в `content/legal` остаётся в тексте настоящим значением и ловится здесь.
 */
vi.mock('@/lib/site/owner-facts', () => ({
  contactGeneral: 'general@test.invalid',
  contactRights: 'rights@test.invalid',
  contactPrivacy: 'privacy@test.invalid',
  contactResponseDays: 9001,
  operatorLegalName: 'OPERATOR-NAME',
  operatorLegalNameRu: 'OPERATOR-NAME-RU',
  operatorCountry: 'XA',
  operatorPostalAddress: 'OPERATOR-ADDRESS',
  operatorPostalAddressRu: 'OPERATOR-ADDRESS-RU',
  governingLawCountry: 'XB',
  minimumAge: 9002,
  retentionServerLogsDays: 9003,
  retentionBackupsMonths: 9004,
  retentionAnalyticsMaxMonths: 9005,
  retentionDeletionHours: 9006,
  // Второй статус: текст обязан смениться во всех 15 модулях (решение арбитра 14.10.2026).
  operatorStatus: 'sole-proprietor',
}));
vi.mock('@/lib/i18n/countryName', () => ({
  countryName: (code: string) => `COUNTRY-${code}`,
}));

const PAGES: LegalPageId[] = [
  'privacy',
  'terms',
  'cookies',
  'about',
  'contact',
  'editorial-policy',
  'legal-notice',
];
const MOCK_EMAILS = ['general@test.invalid', 'rights@test.invalid', 'privacy@test.invalid'];
// Настоящие значения из owner-facts.md: при подменённом модуле их в тексте быть не должно.
const REAL_FACTS = [
  'bibliaris.com',
  'Berezov',
  'Березов',
  'Adonts',
  'Адонц',
  'Yerevan',
  'Ереван',
  'Armenia',
  'Армени',
  'Arménie',
  'Armênia',
];

const inlines = (doc: LegalDocument): LegalInline[] =>
  doc.sections.flatMap((section) =>
    section.blocks.flatMap((block) => {
      if (block.kind === 'widget') return [];
      if (block.kind === 'table') return block.rows.flat(2);
      return block.kind === 'list' ? block.items.flat() : block.content;
    })
  );

describe('правовые тексты: факты владельца только из owner-facts', () => {
  for (const page of PAGES) {
    it.each(SUPPORTED_LANGS)(`${page}/%s: нет второго написания фактов`, (lang) => {
      const doc = getLegalDocument(page, lang);
      const text = JSON.stringify(doc);
      expect(REAL_FACTS.filter((fact) => text.includes(fact))).toEqual([]);
      const emails = inlines(doc).flatMap((part) => (part.kind === 'mailto' ? [part.email] : []));
      expect(emails.filter((email) => !MOCK_EMAILS.includes(email))).toEqual([]);
    });
  }

  it.each(SUPPORTED_LANGS)('legal-notice/%s: имя, статус, адрес и почта оператора', (lang) => {
    const text = JSON.stringify(getLegalDocument('legal-notice', lang));
    const suffix = lang === 'ru' ? '-RU' : '';
    expect(text).toContain(`OPERATOR-NAME${suffix}`);
    expect(text).toContain(`OPERATOR-ADDRESS${suffix}`);
    expect(text).toContain('general@test.invalid');
    if (lang !== 'ru') expect(text).not.toContain('-RU');
  });

  it.each(SUPPORTED_LANGS)('privacy/%s: сроки, возраст и страна - из констант', (lang) => {
    const text = JSON.stringify(getLegalDocument('privacy', lang));
    for (const marker of ['9001', '9002', '9003', '9004', '9005', '9006', 'COUNTRY-XA']) {
      expect(text).toContain(marker);
    }
    // Почтовый адрес оператора публикуется только на /legal-notice (решение арбитра 14.10.2026).
    expect(text).not.toContain('OPERATOR-ADDRESS');
  });

  it.each(SUPPORTED_LANGS)('terms/%s: возраст и применимое право - из констант', (lang) => {
    const text = JSON.stringify(getLegalDocument('terms', lang));
    expect(text).toContain('9002');
    expect(text).toContain('COUNTRY-XB');
  });

  it('contact: срок ответа из константы, почтового адреса нет - только ссылка на /legal-notice', () => {
    for (const lang of SUPPORTED_LANGS) {
      const text = JSON.stringify(getLegalDocument('contact', lang));
      expect(text).toContain('9001');
      expect(text).not.toContain('OPERATOR-ADDRESS');
    }
  });
});

describe('исходники content/legal: адреса почты не пишутся литералом', () => {
  const root = path.resolve(__dirname, '../../../content/legal');
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      return statSync(full).isDirectory() ? files(full) : full.endsWith('.ts') ? [full] : [];
    });

  it('ни одного адреса вида x@y.z в модулях', () => {
    const offenders = files(root).filter((file) =>
      /[\w.+-]+@[\w-]+\.[\w.]+/.test(readFileSync(file, 'utf8'))
    );
    expect(offenders.map((file) => path.relative(root, file))).toEqual([]);
  });
});

describe('статус оператора - из owner-facts.ts', () => {
  for (const page of ['legal-notice', 'privacy', 'terms'] as const) {
    it.each(SUPPORTED_LANGS)(`${page}/%s: слово второго статуса, а не первого`, (lang) => {
      const text = JSON.stringify(getLegalDocument(page, lang));
      const { inline, label } = operatorStatusText[lang]['sole-proprietor'];
      expect(text).toContain(page === 'legal-notice' ? label : inline);
      expect(text).not.toContain(operatorStatusText[lang].individual.label);
    });
  }
});
