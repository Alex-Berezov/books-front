import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QuotesBlock } from '@/components/common/QuotesBlock/QuotesBlock';

/**
 * Общий блок цитат (`ui-kit.md`: второго рендера цитат не заводить). F03-2 добавил необязательные
 * `id` секции, толкование под цитатой и дополнение (метки тем) - без них блок прежний.
 */
describe('QuotesBlock', () => {
  it('без новых полей - прежний вид: цитата в кавычках и подпись', () => {
    const { container } = render(
      <QuotesBlock title="Quotes" items={[{ text: 'To be', author: 'Hamlet' }]} />
    );

    expect(container.querySelector('section')?.id).toBe('');
    expect(screen.getByText('“To be”')).toBeInTheDocument();
    expect(screen.getByText(/Hamlet/)).toBeInTheDocument();
  });

  it('id секции, ссылка-подпись, толкование абзацами и дополнение', () => {
    const { container } = render(
      <QuotesBlock
        id="key-quotes"
        title="Key quotes"
        items={[
          {
            text: 'To be',
            source: 'Hamlet · Chapter 2',
            sourceHref: '/en/book/hamlet/read?chapter=2',
            comment: ['First.', 'Second.'],
            extra: <span>tag</span>,
          },
        ]}
      />
    );

    expect(container.querySelector('section')?.id).toBe('key-quotes');
    expect(screen.getByRole('link', { name: 'Hamlet · Chapter 2' })).toHaveAttribute(
      'href',
      '/en/book/hamlet/read?chapter=2'
    );
    expect(screen.getByText('First.')).toBeInTheDocument();
    expect(screen.getByText('Second.')).toBeInTheDocument();
    expect(screen.getByText('tag')).toBeInTheDocument();
  });
});
