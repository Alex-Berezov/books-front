import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompareEstimate } from '@/components/admin/translation-compare/TranslationCompare/CompareEstimate';
import type { TranslationCompareEstimate } from '@/types/api-schema';

/** T151: строка досье оценки сравнения несёт отказ на старте. */

const line = { estimateUsd: '0.5', suggestedLimitUsd: '0.75', upperBound: false };

const estimate = (refusedTooLong: boolean): TranslationCompareEstimate => ({
  chapterNumber: 1,
  targetLanguage: 'es',
  chunks: 1,
  dossier: { ...line, refusedTooLong },
  glossary: null,
  splitUsd: '0.01',
  models: [{ model: 'a/one', estimateUsd: '0.1' }],
  upperBound: true,
  translationsUsd: '0.11',
  suggestedLimitUsd: '1',
});

describe('CompareEstimate', () => {
  it('dossier the start will refuse: the warning is shown (T151)', () => {
    render(<CompareEstimate estimate={estimate(true)} />);

    expect(screen.getByText(/DOSSIER_TOO_LONG/)).toBeTruthy();
    // Суммы глоссария, моделей и лимита остаются (решение арбитра T151); суммы досье нет.
    expect(screen.getByText('will not be built')).toBeTruthy();
    expect(screen.queryByText('up to $0.5')).toBeNull();
    expect(screen.getByText('up to $0.1')).toBeTruthy();
    expect(screen.getByText('Suggested limit')).toBeTruthy();
  });

  it('dossier that builds: no warning', () => {
    render(<CompareEstimate estimate={estimate(false)} />);

    expect(screen.queryByText(/DOSSIER_TOO_LONG/)).toBeNull();
    expect(screen.getByText('up to $0.5')).toBeTruthy();
  });
});
