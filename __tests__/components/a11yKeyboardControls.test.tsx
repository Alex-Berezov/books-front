import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TerritoryRegionsPanel } from '@/components/admin/RightsIntakeDetail/TerritoryRegionsPanel/TerritoryRegionsPanel';
import { Modal } from '@/components/common/Modal';
import type { TerritoryRegionSummary } from '@/types/api-schema/rights-intake';

const region: TerritoryRegionSummary = {
  regionCode: 'EU',
  label: 'European Union',
  status: 'ALLOWED',
  countryCount: 27,
  targetedCountryCount: 3,
  allowedCountryCount: 3,
  blockedCountryCount: 0,
  pendingCountriesCount: 0,
  geoBlockRequiredCount: 0,
  countries: [],
} as unknown as TerritoryRegionSummary;

/**
 * 🔴 `LEGACY-041`: панели прав управлялись только мышью — аккордеон региона и тела
 * модалок были `div` с `onClick` без клавиатурной ветки. Сторожа ниже краснеют
 * на возврате: снятый `onKeyDown` у шапки региона и `stopPropagation` вместо
 * проверки цели клика у подложки.
 */
describe('клавиатура в панелях прав и общей модалке', () => {
  it('шапка региона раскрывается с клавиатуры', () => {
    render(<TerritoryRegionsPanel regions={[region]} />);

    const header = screen.getByRole('button', { name: /European Union/ });
    expect(header).toHaveAttribute('tabindex', '0');
    expect(header).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(header, { key: 'Enter' });
    expect(header).toHaveAttribute('aria-expanded', 'false');

    fireEvent.keyDown(header, { key: ' ' });
    expect(header).toHaveAttribute('aria-expanded', 'true');
  });

  it('общая модалка закрывается Escape, даже когда фокус остался снаружи', () => {
    const onCancel = vi.fn();
    const { container } = render(
      <>
        <button type="button">Кнопка страницы</button>
        <Modal isOpen title="Заголовок" onCancel={onCancel}>
          <p>Тело</p>
        </Modal>
      </>
    );

    // 🔴 Окно открывают кнопкой на странице, и без переноса фокуса Escape не долетал
    // до обработчика вовсе. Слушатель при этом синтетический, а не на документе:
    // иначе Escape, погашенный выпадающим списком antd внутри окна, закрывал бы
    // всё окно вместе с введённым.
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(document.activeElement).toBe(dialog);

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);

    // Подложка не притворяется кнопкой: ни роли, ни остановки табуляции.
    const overlay = container.querySelector('[role="presentation"]');
    expect(overlay).not.toBeNull();
    expect(overlay).not.toHaveAttribute('tabindex');
    expect(container.querySelector('[role="dialog"]')).toHaveAttribute('aria-modal', 'true');
  });

  it('фокус уходит в окно при открытии и возвращается на кнопку при закрытии', () => {
    const onCancel = vi.fn();
    const page = (isOpen: boolean) => (
      <>
        <button type="button">Открыть</button>
        <Modal isOpen={isOpen} title="Заголовок" onCancel={onCancel}>
          <p>Тело</p>
        </Modal>
      </>
    );

    const { rerender, container } = render(page(false));
    const opener = screen.getByRole('button', { name: 'Открыть' });
    opener.focus();

    rerender(page(true));
    expect(document.activeElement).toBe(container.querySelector('[role="dialog"]'));

    // 🔴 Без возврата фокус падает на `body`, и следующий Tab начинает обход
    // страницы с начала — для клавиатуры это потеря места.
    rerender(page(false));
    expect(document.activeElement).toBe(opener);
  });

  it('Tab замкнут внутри окна и не уходит на страницу под подложкой', () => {
    const onCancel = vi.fn();
    const { container } = render(
      <>
        <button type="button">Ссылка страницы</button>
        <Modal isOpen title="Заголовок" onCancel={onCancel} onConfirm={vi.fn()}>
          <p>Тело</p>
        </Modal>
      </>
    );

    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    const inside = Array.from(dialog.querySelectorAll('button'));
    const first = inside[0];
    const last = inside[inside.length - 1];

    // 🔴 Окно рисуется в общем потоке: без замыкания Tab из последней кнопки уходит
    // на страницу под подложкой, и посетитель «выпадает» из диалога, не закрыв его.
    last.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('клик по телу модалки её не закрывает, а клик по подложке — закрывает', () => {
    const onCancel = vi.fn();
    const { container } = render(
      <Modal isOpen title="Заголовок" onCancel={onCancel}>
        <p>Тело</p>
      </Modal>
    );

    fireEvent.click(screen.getByText('Тело'));
    expect(onCancel).not.toHaveBeenCalled();

    const overlay = container.firstElementChild as HTMLElement;
    fireEvent.click(overlay);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('загрузка держит модалку открытой и на Escape, и на клике по подложке', () => {
    const onCancel = vi.fn();
    const { container } = render(
      <Modal isOpen isLoading title="Заголовок" onCancel={onCancel}>
        <p>Тело</p>
      </Modal>
    );

    const overlay = container.firstElementChild as HTMLElement;
    fireEvent.keyDown(container.querySelector('[role="dialog"]') as HTMLElement, { key: 'Escape' });
    fireEvent.click(overlay);

    expect(onCancel).not.toHaveBeenCalled();
  });
});
