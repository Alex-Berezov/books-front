import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AnalysisCheckSummary } from '@/components/admin/books/AnalysisTab/AnalysisCheckSummary';
import styles from '@/components/admin/books/AnalysisTab/AnalysisTab.module.scss';

/**
 * Итог проверки сервера на вкладке Analysis. У admin ядро — в плашке хода (`withoutCore`, F07-3a):
 * здесь остальные предупреждения, и оставшееся предупреждение не красится «всё хорошо».
 */

const chapter = {
  code: 'chapter_not_found' as const,
  path: 'themes.0.chapters.0',
  message: 'chapter 9',
};
const core = { code: 'core_incomplete' as const, path: 'themes', message: 'themes: 1 of 2' };

describe('AnalysisCheckSummary', () => {
  it('withoutCore with warnings left — no green frame, no core sentence, no core warning', () => {
    render(
      <AnalysisCheckSummary check={{ hasCore: true, warnings: [chapter, core] }} withoutCore />
    );
    const box = screen.getByRole('status');
    expect(box).toHaveClass(styles.status);
    expect(box).not.toHaveClass(styles.statusOk);
    expect(screen.getByText('themes.0.chapters.0: chapter 9')).toBeInTheDocument();
    expect(screen.queryByText(/themes: 1 of 2/)).toBeNull();
    expect(screen.queryByText(/Core is/)).toBeNull();
  });

  it('withoutCore and only core warnings — nothing at all', () => {
    const { container } = render(
      <AnalysisCheckSummary check={{ hasCore: false, warnings: [core] }} withoutCore />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('without the flag (not admin) — the core sentence; green only with a complete core', () => {
    const { rerender } = render(
      <AnalysisCheckSummary check={{ hasCore: true, warnings: [chapter] }} />
    );
    expect(screen.getByRole('status')).toHaveClass(styles.statusOk);
    expect(screen.getByText(/Core is complete/)).toBeInTheDocument();
    rerender(<AnalysisCheckSummary check={{ hasCore: false, warnings: [core] }} />);
    expect(screen.getByRole('status')).not.toHaveClass(styles.statusOk);
    expect(screen.getByText(/Core is incomplete/)).toBeInTheDocument();
  });
});
