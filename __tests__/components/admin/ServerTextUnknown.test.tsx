import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ServerTextUnknown } from '@/components/admin/books/SummaryTab/ServerTextUnknown';
import { SUMMARY_FIELD_LABEL } from '@/components/admin/books/SummaryTab/summaryTab.constants';

/** T174, п.5: плашка «текст не выяснен» называет поле одной подписью и зовёт повтор. */
describe('ServerTextUnknown', () => {
  it('names the field and retries on the button', () => {
    const onRetry = vi.fn();
    render(<ServerTextUnknown field={SUMMARY_FIELD_LABEL.briefText} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load the server text of “Very short summary”'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
