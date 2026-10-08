import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton, SkeletonBlock } from '@/components/common/Skeleton';

// LEGACY-442: заглушка заменила Skeleton antd на публичных страницах.
describe('Skeleton', () => {
  const rowsOf = (container: HTMLElement) => container.querySelectorAll('li');

  it('рисует заданное число строк абзаца', () => {
    expect(rowsOf(render(<Skeleton rows={2} />).container)).toHaveLength(2);
    expect(rowsOf(render(<Skeleton rows={8} />).container)).toHaveLength(8);
  });

  it('по умолчанию — заголовок и три строки', () => {
    const { container } = render(<Skeleton />);

    expect(rowsOf(container)).toHaveLength(3);
    expect(container.querySelectorAll('[data-skeleton] > div > span')).toHaveLength(1);
  });

  it('без заголовка и без строк рисует пустую заглушку', () => {
    const { container } = render(<Skeleton rows={0} title={false} />);

    expect(rowsOf(container)).toHaveLength(0);
    expect(container.querySelectorAll('[data-skeleton] > div > span')).toHaveLength(0);
  });

  it('аватар — отдельный элемент перед текстом', () => {
    const { container } = render(<Skeleton avatar />);

    expect(container.querySelectorAll('[data-skeleton] > span')).toHaveLength(1);
  });

  it('скрыта от вспомогательных технологий и помечена для тестов', () => {
    const { container } = render(
      <>
        <Skeleton />
        <SkeletonBlock className="custom" />
      </>
    );
    const marked = container.querySelectorAll('[data-skeleton]');

    expect(marked).toHaveLength(2);
    marked.forEach((node) => expect(node).toHaveAttribute('aria-hidden', 'true'));
    expect(container.querySelector('.custom')).not.toBeNull();
  });
});
