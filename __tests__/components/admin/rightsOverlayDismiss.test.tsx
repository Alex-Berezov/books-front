import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ReviewImportDetailModal } from '@/components/admin/RightsIntakeDetail/ReviewImportDetailModal/ReviewImportDetailModal';
import type { RightsReviewImportDetail } from '@/types/api-schema/rights-intake';

const importData = {
  id: 'imp-1',
  importStatus: 'APPLIED',
  createdAt: '2026-09-06T00:00:00.000Z',
  rawReport: { verdict: 'ALLOW' },
} as unknown as RightsReviewImportDetail;

/**
 * 🔴 `LEGACY-041`: подложка окна закрывалась по любому клику, который до неё
 * долетал, а клик внутри тела гасился `stopPropagation` — обработчиком на элементе,
 * нажимать который не предполагается. Тело перестало быть псевдокнопкой, и теперь
 * подложка сама смотрит на цель клика.
 *
 * Сторож краснеет на возврате: `onClick={onClose}` без проверки цели закроет окно
 * от клика по его же содержимому.
 */
describe('подложка окна в панелях прав', () => {
  it('клик по содержимому не закрывает окно, клик по подложке — закрывает', () => {
    const onClose = vi.fn();
    const { container } = render(
      <ReviewImportDetailModal importData={importData} onClose={onClose} />
    );

    fireEvent.click(screen.getByText('Review Import Detail'));
    expect(onClose).not.toHaveBeenCalled();

    const overlay = container.firstElementChild as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('окно забирает фокус, и Escape из него закрывает окно', () => {
    const onClose = vi.fn();
    const { container } = render(
      <>
        <button type="button">Строка истории импорта</button>
        <ReviewImportDetailModal importData={importData} onClose={onClose} />
      </>
    );

    // 🔴 Окно открывают строкой списка, и без переноса фокуса Escape не долетал
    // до обработчика вовсе. Сторож краснеет на снятии `focus()` при открытии.
    const dialog = container.querySelector('[tabindex="-1"]') as HTMLElement;
    expect(document.activeElement).toBe(dialog);

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
