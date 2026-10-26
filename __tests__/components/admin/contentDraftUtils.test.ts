import { describe, expect, it } from 'vitest';
import {
  estimateText,
  failedText,
  refusalText,
} from '@/components/admin/books/ContentDraft/contentDraft.utils';
import { ApiError } from '@/types/api';
import type { ContentDraftEstimate } from '@/types/api-schema';

/**
 * F05-10, F05-11: подписи общей оболочки заготовки — оценка сверху по виду и причина отказа.
 */

const estimate = (patch: Partial<ContentDraftEstimate>): ContentDraftEstimate => ({
  kind: 'summary_sections',
  dossier: null,
  glossary: null,
  sections: null,
  stageUsd: '0.5',
  upperBound: true,
  suggestedLimitUsd: '0.75',
  ...patch,
});

describe('contentDraft.utils', () => {
  it('upper estimate: sections — one section per chapter; analysis — dossier not built yet', () => {
    expect(estimateText(estimate({}))).toContain('one section per chapter');
    const analysis = estimateText(estimate({ kind: 'analysis' }));
    expect(analysis).toContain('the dossier is not built yet: upper estimate');
    expect(analysis).not.toContain('section');
    expect(estimateText(estimate({ sections: 4, upperBound: false }))).toContain('(4 sections)');
  });

  it('SOURCE_HAS_NO_CHAPTERS of a draft speaks of drafting, not of translating (Р26)', () => {
    const error = new ApiError({
      statusCode: 409,
      message: 'no text',
      data: { code: 'SOURCE_HAS_NO_CHAPTERS' },
    });
    expect(refusalText(error)).toBe('This version has no chapter text to draft from.');
  });

  it('DRAFT_INPUT_MISSING names a version without chapter text', () => {
    expect(failedText('DRAFT_INPUT_MISSING')).toBe(
      'Failed: the saved text it was built from is gone or the version has no chapter text.'
    );
  });
});
