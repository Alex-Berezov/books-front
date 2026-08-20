import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RightsIntakeHeader } from '@/components/admin/RightsIntakeDetail/RightsIntakeHeader/RightsIntakeHeader';
import type { RightsIntake } from '@/types/api-schema/rights-intake';

/**
 * WP-M.2: отказ смены статуса не был виден нигде — `mutateAsync` без `catch` ронял
 * необработанный промис в консоль, кнопка возвращалась в исходный вид, и картинка для
 * редактора совпадала с бездействием: «нажимаю, ничего не происходит».
 */

const intake = {
  id: 'intake-1',
  candidateTitle: 'Преступление и наказание',
  candidateAuthor: 'Фёдор Достоевский',
  workflowStatus: 'DRAFT',
  createdBookId: null,
} as unknown as RightsIntake;

describe('RightsIntakeHeader: видимый отказ смены статуса', () => {
  it('показывает сообщение об ошибке рядом со статусом', () => {
    render(
      <RightsIntakeHeader
        intake={intake}
        lang="en"
        errorMessage="Cannot transition from 'DRAFT' to 'READY_FOR_AGENT'."
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      "Cannot transition from 'DRAFT' to 'READY_FOR_AGENT'."
    );
  });

  it('без ошибки ничего лишнего не рисует', () => {
    render(<RightsIntakeHeader intake={intake} lang="en" />);

    expect(screen.queryByRole('alert')).toBeNull();
  });
});
