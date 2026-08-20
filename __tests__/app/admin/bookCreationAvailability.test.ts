import { describe, expect, it } from 'vitest';
import { resolveBookCreationAvailability } from '@/app/admin/[lang]/rights-intakes/[id]/bookCreationAvailability';
import type { RightsProfileDetail } from '@/types/api-schema/rights-intake';

const profile = (overrides: Partial<RightsProfileDetail> = {}): RightsProfileDetail =>
  ({
    id: 'profile-1',
    rightsIntakeId: 'intake-1',
    status: 'APPROVED',
    isCurrent: true,
    reviews: [{ id: 'review-1', status: 'HUMAN_APPROVED' }],
    ...overrides,
  }) as unknown as RightsProfileDetail;

const intake = (overrides: Record<string, unknown> = {}) =>
  ({
    workflowStatus: 'APPROVED',
    createdBookId: null,
    approvedReviewId: 'review-1',
    ...overrides,
  }) as Parameters<typeof resolveBookCreationAvailability>[0];

describe('resolveBookCreationAvailability', () => {
  it('allows creation on an approved intake with an approved profile', () => {
    expect(resolveBookCreationAvailability(intake(), profile())).toEqual({
      canCreate: true,
      isRecreationAfterDeletedBook: false,
    });
  });

  /**
   * Книгу создали и удалили: внешний ключ обнулил `createdBookId`, а ручных переходов из
   * `BOOK_CREATED` нет — без этой ветки к книге вёл только повторный прогон той же проверки.
   */
  it('allows creating again when the created book was deleted', () => {
    const result = resolveBookCreationAvailability(
      intake({ workflowStatus: 'BOOK_CREATED', createdBookId: null }),
      profile()
    );

    expect(result).toEqual({ canCreate: true, isRecreationAfterDeletedBook: true });
  });

  it('keeps the form hidden while the created book is alive', () => {
    expect(
      resolveBookCreationAvailability(
        intake({ workflowStatus: 'BOOK_CREATED', createdBookId: 'book-1' }),
        profile()
      ).canCreate
    ).toBe(false);
  });

  it('does not offer creation before the profile is approved', () => {
    expect(resolveBookCreationAvailability(intake(), profile({ status: 'DRAFT' })).canCreate).toBe(
      false
    );
  });

  it('does not offer creation when the approved review is not the human-approved one', () => {
    expect(
      resolveBookCreationAvailability(intake({ approvedReviewId: 'review-9' }), profile()).canCreate
    ).toBe(false);
  });

  it('does not offer creation without a profile at all', () => {
    expect(resolveBookCreationAvailability(intake(), undefined).canCreate).toBe(false);
  });
});
