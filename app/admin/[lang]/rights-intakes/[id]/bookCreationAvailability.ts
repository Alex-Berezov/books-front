/**
 * Когда по утверждённой проверке прав можно создать книгу.
 *
 * Живёт отдельным файлом затем же, зачем и `statusActionError`: страница — клиентский компонент
 * с десятком хуков, и условие внутри неё не проверить тестом.
 */

import type { RightsIntake, RightsProfileDetail } from '@/types/api-schema/rights-intake';

export interface BookCreationAvailability {
  /** Показывать ли форму создания книги */
  canCreate: boolean;
  /** Книгу по этой проверке уже создавали, но её удалили */
  isRecreationAfterDeletedBook: boolean;
}

/**
 * `BOOK_CREATED` без `createdBookId` — это удалённая книга: внешний ключ обнуляет ссылку сам
 * (`onDelete: SetNull`), а ручных переходов из `BOOK_CREATED` нет вовсе. Без этой ветки проверка
 * оставалась утверждённой, но создать по ней было нечего: единственным путём к книге становилась
 * повторная проверка тех же самых прав.
 */
export const resolveBookCreationAvailability = (
  intake: Pick<RightsIntake, 'workflowStatus' | 'createdBookId' | 'approvedReviewId'>,
  currentProfile: RightsProfileDetail | null | undefined
): BookCreationAvailability => {
  const isRecreationAfterDeletedBook =
    intake.workflowStatus === 'BOOK_CREATED' && !intake.createdBookId;

  const statusAllows = intake.workflowStatus === 'APPROVED' || isRecreationAfterDeletedBook;

  const profileApproved =
    currentProfile?.status === 'APPROVED' &&
    currentProfile.reviews.some(
      (review) => review.id === intake.approvedReviewId && review.status === 'HUMAN_APPROVED'
    );

  return {
    canCreate: statusAllows && !intake.createdBookId && Boolean(profileApproved),
    isRecreationAfterDeletedBook,
  };
};
