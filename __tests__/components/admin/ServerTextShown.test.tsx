import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ServerBlockText } from '@/components/admin/books/AnalysisTab/ServerBlockText';
import { ServerTextNotice } from '@/components/admin/books/SummaryTab/ServerTextNotice';

/** Решение арбитра `T173 | LEGACY-496`: чужой текст виден рядом с правкой, HTML не разбирается. */
describe('текст сервера рядом с несохранённой правкой', () => {
  it('пересказ: HTML показан текстом, разметка не вставлена', () => {
    const { container } = render(
      <ServerTextNotice field="Summary" text="<p>Theirs.</p>" onLoad={vi.fn()} />
    );
    expect(screen.getByText('<p>Theirs.</p>')).toBeInTheDocument();
    expect(container.querySelector('pre p')).toBeNull();
  });

  it('анализ: нет текста - нет показа, пустой - подпись, иначе текст', () => {
    const { container, rerender } = render(<ServerBlockText text={undefined} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ServerBlockText text="" />);
    expect(screen.getByText('(empty)')).toBeInTheDocument();
    rerender(<ServerBlockText text="Theirs." />);
    expect(screen.getByText('Theirs.')).toBeInTheDocument();
  });
});
