import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslateButton } from '@/components/admin/translation-run/TranslateButton';
import type { TranslationSource } from '@/types/api-schema';

/** F05-7: кнопка «Translate to other languages» неактивна с подсказкой по `translation-source`. */

const hooks = vi.hoisted(() => ({
  source: { data: undefined, isLoading: false, isError: false } as Record<string, unknown>,
}));

vi.mock('@/api/hooks', () => ({
  useTranslationSource: () => hooks.source,
}));

vi.mock('next/dynamic', () => ({
  default: () => () => <div role="dialog" aria-label="Start run" />,
}));

const source = (over: Partial<TranslationSource>): TranslationSource => ({
  canTranslate: false,
  reason: null,
  sourceVersionId: null,
  sourceLanguage: 'fr',
  originalLanguageRaw: 'fr',
  originalLanguageMismatch: false,
  targets: [],
  ...over,
});

const button = () => screen.getByRole('button', { name: /Translate to other languages/ });

describe('Кнопка перевода (F05-7, §2.1)', () => {
  beforeEach(() => {
    hooks.source = { data: undefined, isLoading: false, isError: false };
  });

  it.each([
    ['SOURCE_HAS_NO_CHAPTERS', 'This version has no chapter text to translate.'],
    ['NOT_ORIGINAL_VERSION', 'Translate from the version in the original language.'],
    ['ORIGINAL_VERSION_MISSING', 'Upload a version in the original language (fr).'],
    ['SOURCE_LANGUAGE_UNKNOWN', 'Set the original language of the book.'],
    ['NO_AVAILABLE_TARGETS', 'Nothing to translate into: every language is unavailable.'],
  ] as const)('%s — неактивна с подсказкой', (reason, hint) => {
    hooks.source = { data: source({ reason }), isLoading: false, isError: false };
    render(<TranslateButton versionId="v1" bookId="b1" />);

    expect(button()).toBeDisabled();
    expect(screen.getByText(hint)).toBeInTheDocument();
  });

  it('расхождение «языка оригинала» видно рядом с кнопкой', () => {
    hooks.source = {
      data: source({
        canTranslate: true,
        originalLanguageMismatch: true,
        originalLanguageRaw: 'French',
      }),
      isLoading: false,
      isError: false,
    };
    render(<TranslateButton versionId="v1" bookId="b1" />);

    expect(screen.getByText(/differs between versions.*French/)).toBeInTheDocument();
  });

  it('можно переводить — активна и открывает окно запуска', () => {
    hooks.source = { data: source({ canTranslate: true }), isLoading: false, isError: false };
    render(<TranslateButton versionId="v1" bookId="b1" />);

    expect(button()).toBeEnabled();
    fireEvent.click(button());
    expect(screen.getByRole('dialog', { name: 'Start run' })).toBeInTheDocument();
  });

  it('отказ запроса языков — неактивна с подписью отказа', () => {
    hooks.source = { data: undefined, isLoading: false, isError: true };
    render(<TranslateButton versionId="v1" bookId="b1" />);

    expect(button()).toBeDisabled();
    expect(screen.getByText('Translation availability could not be loaded.')).toBeInTheDocument();
  });

  it('пока языки грузятся — кнопка неактивна', () => {
    hooks.source = { data: undefined, isLoading: true, isError: false };
    render(<TranslateButton versionId="v1" bookId="b1" />);

    expect(button()).toBeDisabled();
  });
});
