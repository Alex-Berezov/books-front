import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReaderView } from '@/components/common/ReaderView';
import styles from '@/components/common/ReaderView/ReaderView.module.scss';

vi.mock('next/navigation', () => ({
  usePathname: () => '/ru/book/hamlet/read',
}));

const chapters = [
  { id: 'c1', title: 'Акт первый', content: '<p>Первый</p>' },
  { id: 'c2', title: 'Акт второй', content: '<p>Второй</p>' },
  { id: 'c3', title: 'Акт третий', content: '<p>Третий</p>' },
  { id: 'c4', title: 'Акт четвёртый', content: '<p>Четвёртый</p>' },
];

const progressFill = (container: HTMLElement) =>
  container.querySelector('[aria-hidden="true"] > div') as HTMLElement;

/**
 * The reader's view was taken out of `ReaderClient` so the admin preview could
 * show a draft through it. Two things changed shape on the way and are pinned
 * here: the progress bar width now goes in as a css variable (a `style` prop is
 * a lint error in a new file), and the scroll to the top on a chapter change
 * now lives in the view.
 */
describe('ReaderView', () => {
  let scrollTo: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('полоса прогресса показывает долю прочитанных глав', () => {
    const { container, rerender } = render(
      <ReaderView
        chapters={chapters}
        currentChapterIndex={0}
        onChapterChange={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(progressFill(container).style.getPropertyValue('--reader-progress')).toBe('25%');

    rerender(
      <ReaderView
        chapters={chapters}
        currentChapterIndex={3}
        onChapterChange={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(progressFill(container).style.getPropertyValue('--reader-progress')).toBe('100%');
  });

  it('пустая книга - полоса на нуле', () => {
    const { container } = render(
      <ReaderView
        chapters={[]}
        currentChapterIndex={0}
        onChapterChange={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(progressFill(container).style.getPropertyValue('--reader-progress')).toBe('0%');
  });

  it('смена главы прокручивает к началу', () => {
    const { rerender } = render(
      <ReaderView
        chapters={chapters}
        currentChapterIndex={0}
        onChapterChange={vi.fn()}
        onBack={vi.fn()}
      />
    );
    scrollTo.mockClear();

    rerender(
      <ReaderView
        chapters={chapters}
        currentChapterIndex={1}
        onChapterChange={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('стрелки и оглавление отдают индекс главы наружу', () => {
    const onChapterChange = vi.fn();
    render(
      <ReaderView
        chapters={chapters}
        currentChapterIndex={1}
        onChapterChange={onChapterChange}
        onBack={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Следующая глава' }));
    fireEvent.click(screen.getByRole('button', { name: 'Предыдущая глава' }));
    expect(onChapterChange).toHaveBeenNthCalledWith(1, 2);
    expect(onChapterChange).toHaveBeenNthCalledWith(2, 0);

    fireEvent.click(screen.getByRole('button', { name: 'Оглавление' }));
    fireEvent.click(screen.getByRole('button', { name: /Акт четвёртый/ }));
    expect(onChapterChange).toHaveBeenNthCalledWith(3, 3);
    expect(screen.queryByRole('dialog', { name: 'Оглавление' })).not.toBeInTheDocument();
  });

  it('настройки меняют тему, размер шрифта и межстрочный интервал', () => {
    const { container } = render(
      <ReaderView
        chapters={chapters}
        currentChapterIndex={0}
        onChapterChange={vi.fn()}
        onBack={vi.fn()}
      />
    );
    const root = container.firstElementChild as HTMLElement;
    const body = screen.getByText('Первый').parentElement as HTMLElement;

    expect(root).toHaveClass(styles.themeLight);
    expect(body).toHaveClass(styles.chapterBody, styles.fontSizeMd, styles.lineHeight18);

    fireEvent.click(screen.getByRole('button', { name: 'Настройки чтения' }));

    fireEvent.click(screen.getByRole('button', { name: 'Сепия' }));
    expect(root).toHaveClass(styles.themeSepia);
    expect(root).not.toHaveClass(styles.themeLight);

    fireEvent.click(screen.getByRole('button', { name: 'Темная' }));
    expect(root).toHaveClass(styles.themeDark);
    expect(screen.getByRole('button', { name: 'Темная' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'XL' }));
    expect(body).toHaveClass(styles.fontSizeXl);
    expect(body).not.toHaveClass(styles.fontSizeMd);

    fireEvent.change(screen.getByRole('slider'), { target: { value: '6' } });
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '2.4');
    expect(body).toHaveClass(styles.lineHeight24);
    expect(body).not.toHaveClass(styles.lineHeight18);
  });

  it.each([
    ['Оглавление', 'Оглавление'],
    ['Настройки чтения', 'Настройки чтения'],
  ])('шторка «%s» закрывается по Escape, по фону и по крестику', (button, dialog) => {
    const { container } = render(
      <ReaderView
        chapters={chapters}
        currentChapterIndex={0}
        onChapterChange={vi.fn()}
        onBack={vi.fn()}
      />
    );
    const open = () => fireEvent.click(screen.getByRole('button', { name: button }));
    const panel = () => screen.queryByRole('dialog', { name: dialog });

    open();
    fireEvent.keyDown(panel() as HTMLElement, { key: 'Escape' });
    expect(panel()).not.toBeInTheDocument();

    open();
    // Клик внутри панели шторку не закрывает - только по фону.
    fireEvent.click(panel() as HTMLElement);
    expect(panel()).toBeInTheDocument();
    fireEvent.click(container.querySelector('[role="presentation"]') as HTMLElement);
    expect(panel()).not.toBeInTheDocument();

    open();
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(panel()).not.toBeInTheDocument();
  });

  it('к началу прокручивает смена главы, а не сдвиг её номера в списке', () => {
    const { rerender } = render(
      <ReaderView
        chapters={chapters}
        currentChapterIndex={1}
        onChapterChange={vi.fn()}
        onBack={vi.fn()}
      />
    );
    scrollTo.mockClear();

    // Перед текущей главой вставили новую: та же глава, индекс сдвинулся.
    const inserted = [{ id: 'c0', title: 'Пролог', content: '<p>Пролог</p>' }, ...chapters];
    rerender(
      <ReaderView
        chapters={inserted}
        currentChapterIndex={2}
        onChapterChange={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(scrollTo).not.toHaveBeenCalled();

    // Текущую главу удалили: тот же индекс, другая глава.
    const deleted = inserted.filter((c) => c.id !== 'c2');
    rerender(
      <ReaderView
        chapters={deleted}
        currentChapterIndex={2}
        onChapterChange={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('слот notice рисуется между шапкой и текстом', () => {
    render(
      <ReaderView
        chapters={chapters}
        currentChapterIndex={0}
        onChapterChange={vi.fn()}
        onBack={vi.fn()}
        notice={<div role="status">Черновик</div>}
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('Черновик');
  });
});
