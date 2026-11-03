import { describe, expect, it } from 'vitest';
import {
  dossierEstimateText,
  estimateText,
  failedText,
  refusalText,
} from '@/components/admin/books/ContentDraft/contentDraft.utils';
import { ApiError } from '@/types/api';
import type { ContentDraftEstimate } from '@/types/api-schema';

/**
 * F05-11: подписи оболочки заготовки — оценка сверху по виду и причина отказа.
 */

const estimate = (patch: Partial<ContentDraftEstimate>): ContentDraftEstimate => ({
  kind: 'analysis',
  dossier: null,
  glossary: null,
  stageUsd: '0.5',
  upperBound: true,
  suggestedLimitUsd: '0.75',
  ...patch,
});

describe('contentDraft.utils', () => {
  it('upper estimate: the dossier is not built yet; no sections in the analysis text', () => {
    const analysis = estimateText(estimate({}));
    expect(analysis).toContain(
      'The draft: up to $0.5 (the dossier is not built yet: upper estimate).'
    );
    expect(analysis).not.toContain('section');
    expect(estimateText(estimate({ upperBound: false }))).toContain('The draft: up to $0.5.');
  });

  it('SOURCE_HAS_NO_CHAPTERS of a draft speaks of drafting, not of translating (Р26)', () => {
    const error = new ApiError({
      statusCode: 409,
      message: 'no text',
      data: { code: 'SOURCE_HAS_NO_CHAPTERS' },
    });
    expect(refusalText(error)).toBe('This version has no chapter text to draft from.');
  });

  it('DRAFT_TOO_LONG of the analysis estimate names the model context (F05-Rb)', () => {
    const error = new ApiError({
      statusCode: 409,
      message: 'The version text does not fit the context of the analysis model',
      data: { code: 'DRAFT_TOO_LONG' },
    });
    expect(refusalText(error)).toBe(
      'The book text does not fit the analysis model: choose a model with a larger context in LLM settings.'
    );
  });

  it('DRAFT_NO_PLAN is not a reason of the analysis draft: shown as the code (F06-3)', () => {
    expect(failedText('DRAFT_NO_PLAN')).toBe('Failed: DRAFT_NO_PLAN.');
  });

  it('an empty or missing reason is «unknown reason», not an empty text', () => {
    expect(failedText('')).toBe('Failed: unknown reason.');
    expect(failedText(null)).toBe('Failed: unknown reason.');
  });

  it('DRAFT_INPUT_MISSING names a version without chapter text', () => {
    expect(failedText('DRAFT_INPUT_MISSING')).toBe(
      'Failed: the version has no chapter text or the dossier is gone.'
    );
  });

  it('dossier estimate: a book the start will refuse DOSSIER_TOO_LONG says it will not be built, not a sum (T147)', () => {
    const dossier = {
      sourceVersionId: 's',
      chapters: 19,
      parts: 19,
      estimateUsd: '0.5',
      suggestedLimitUsd: '0.75',
    };
    expect(dossierEstimateText({ ...dossier, refusedTooLong: false })).toContain('up to $0.5');
    const refused = dossierEstimateText({ ...dossier, refusedTooLong: true });
    expect(refused).toContain('will not be built');
    expect(refused).toContain('DOSSIER_TOO_LONG');
    expect(refused).not.toContain('$0.5');
  });

  it('draft estimate: a dossier the start will refuse says it will not be built, not a sum (T151)', () => {
    const line = { estimateUsd: '0.5', suggestedLimitUsd: '0.75', upperBound: false };
    expect(estimateText(estimate({ dossier: { ...line, refusedTooLong: false } }))).toContain(
      'The dossier is built first: up to $0.5'
    );
    const refused = estimateText(estimate({ dossier: { ...line, refusedTooLong: true } }));
    expect(refused).toContain('will not be built');
    expect(refused).toContain('DOSSIER_TOO_LONG');
    expect(refused).not.toContain('built first');
  });
});
