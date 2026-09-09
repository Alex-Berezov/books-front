import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AudioPicker } from '@/components/admin/books/ListenContentTab/AudioPicker';
import { PublishConfirmModal } from '@/components/admin/books/PublishPanel/PublishConfirmModal';
import { CategoryTreeNode } from '@/components/admin/categories/CategoryTree/CategoryTreeNode';
import { TerritoryRegionsPanel } from '@/components/admin/RightsIntakeDetail/TerritoryRegionsPanel/TerritoryRegionsPanel';
import { TagModal } from '@/components/admin/tags/TagModal/TagModal';
import { Modal } from '@/components/common/Modal';
import type { TerritoryRegionSummary } from '@/types/api-schema/rights-intake';

vi.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: vi.fn() }),
}));

vi.mock('@/api/hooks/useTags', () => ({
  useCreateTag: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTag: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/api/hooks/useCategories', () => ({
  useCategoryTranslations: () => ({ data: undefined }),
}));

vi.mock('@/api/hooks', () => ({
  useUploadsLimits: () => ({ data: undefined }),
}));

const categoryNode = {
  id: 'node-1',
  key: 'fiction',
  slug: 'fiction',
  name: 'Fiction',
  type: 'genre',
  language: 'en',
  children: [
    {
      id: 'node-2',
      key: 'fantasy',
      slug: 'fantasy',
      name: 'Fantasy',
      type: 'genre',
      language: 'en',
      children: [],
      createdAt: '2026-09-09T00:00:00.000Z',
      updatedAt: '2026-09-09T00:00:00.000Z',
    },
  ],
  createdAt: '2026-09-09T00:00:00.000Z',
  updatedAt: '2026-09-09T00:00:00.000Z',
} as unknown as Parameters<typeof CategoryTreeNode>[0]['node'];

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

  /**
   * 🔴 `LEGACY-016`. Своё окно подтверждения публикации повторяло снятый приём: подложка
   * закрывала окно любым кликом, а тело гасило всплытие `stopPropagation`. Обработчик на
   * неинтерактивном теле требовал клавиатурного близнеца там, где нажимать нечего, — и это
   * ровно то, на что жаловались `click-events-have-key-events` и `no-static-element-interactions`.
   */
  it('своё окно подтверждения закрывается кликом по подложке и Escape, но не кликом по телу', () => {
    const onClose = vi.fn();
    const { container } = render(
      <>
        <button type="button">Кнопка страницы</button>
        <PublishConfirmModal
          isOpen
          actionType="publish"
          isLoading={false}
          onClose={onClose}
          onConfirm={vi.fn()}
        />
      </>
    );

    const overlay = container.querySelector('[role="presentation"]') as HTMLElement;
    expect(overlay).not.toBeNull();

    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    // 🔴 Событие бьётся туда, где фокус **на самом деле**, а не в узел подложки:
    // окно открывают кнопкой страницы, и без переноса фокуса Escape до обработчика
    // не долетает вовсе. Первая редакция этой посадки была зелёной при неработающем
    // Escape именно потому, что стреляла прямо в подложку (нашли три ревьюера).
    expect(document.activeElement).toBe(dialog);

    // Клик по телу окна не закрывает его — но уже не потому, что всплытие погашено
    // обработчиком, а потому, что подложка проверяет цель клика.
    fireEvent.click(screen.getByText('Publish Version'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('Tab замкнут внутри своего окна подтверждения', () => {
    const { container } = render(
      <>
        <button type="button">Кнопка страницы</button>
        <PublishConfirmModal
          isOpen
          actionType="publish"
          isLoading={false}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      </>
    );

    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    const inside = Array.from(dialog.querySelectorAll('button'));
    const first = inside[0];
    const last = inside[inside.length - 1];

    last.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });

  it('своё окно подтверждения не закрывается во время запроса', () => {
    const onClose = vi.fn();
    const { container } = render(
      <PublishConfirmModal
        isOpen
        actionType="unpublish"
        isLoading
        onClose={onClose}
        onConfirm={vi.fn()}
      />
    );

    const overlay = container.querySelector('[role="presentation"]') as HTMLElement;
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
    fireEvent.click(overlay);

    expect(onClose).not.toHaveBeenCalled();
  });

  /**
   * 🔴 `LEGACY-016`. Подписи полей администраторских форм были `<label>` без `htmlFor`:
   * линт жаловался, но опаснее другое — `htmlFor`, дописанный ради зелёного линта и
   * указывающий в пустоту, выглядел бы точно так же. Поэтому проверяется не атрибут,
   * а настоящая связь: поле ищется **по своей подписи**.
   */
  it('подписи полей формы тега связаны с самими полями, а не только выглядят подписями', () => {
    render(<TagModal isOpen lang="en" onClose={vi.fn()} />);

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Slug')).toBeInTheDocument();
    expect(screen.getByLabelText('Key')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort Order')).toBeInTheDocument();
    expect(screen.getByLabelText('Indexable')).toBeInTheDocument();
    expect(screen.getByLabelText('Visible')).toBeInTheDocument();
  });

  /**
   * 🔴 `LEGACY-016`. Линт требует лишь **наличия** `onKeyDown` рядом с `onClick`:
   * заглушка `onKeyDown={() => {}}` прошла бы правило уровня `error` точно так же.
   * Поэтому проверяется поведение, а не атрибут.
   */
  it('стрелка дерева категорий раскрывает узел с клавиатуры', () => {
    render(
      <CategoryTreeNode
        node={categoryNode}
        level={1}
        onEdit={vi.fn()}
        onTranslations={vi.fn()}
        onDelete={vi.fn()}
        onAddSubcategory={vi.fn()}
      />
    );

    const toggle = screen.getByRole('button', { name: /Fiction/ });
    expect(toggle).toHaveAttribute('tabindex', '0');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.keyDown(toggle, { key: 'Enter' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(toggle, { key: ' ' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    // Чужая клавиша ничего не делает — иначе «клавиатурная ветка» была бы просто
    // обработчиком на любое нажатие.
    fireEvent.keyDown(toggle, { key: 'a' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('зона загрузки аудио открывает выбор файла с клавиатуры', () => {
    const { container } = render(<AudioPicker value={null} onChange={vi.fn()} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const click = vi.spyOn(input, 'click');

    const dropzone = screen.getByRole('button', { name: /Drop an audio file/ });
    fireEvent.keyDown(dropzone, { key: 'Enter' });
    expect(click).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(dropzone, { key: ' ' });
    expect(click).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(dropzone, { key: 'a' });
    expect(click).toHaveBeenCalledTimes(2);
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
