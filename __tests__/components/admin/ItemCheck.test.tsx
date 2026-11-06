import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ItemCheck } from '@/components/admin/books/ContentDraft';

/**
 * Общая отметка проверки текста или блока хода. Правило — хода пересказа (F06-3): «OK» по вердикту
 * `ok`, флаги — по вердикту `flags` с замечаниями; что не показывать (CORE_MISSING анализа), решает
 * вызывающий.
 */

const remark = { code: 'NAME_MISMATCH', where: 'Jon', note: 'Use John', by: 'code' as const };
const answered = { kind: 'answered' as const, model: 'm' };

describe('ItemCheck', () => {
  it('verdict ok — «Model check: OK» even with remarks, the remarks are not listed', () => {
    render(<ItemCheck verdict="ok" remarks={[remark]} review={answered} />);
    expect(screen.getByText('Model check: OK')).toBeInTheDocument();
    expect(screen.queryByText(/Model flags/)).toBeNull();
    expect(screen.getByText('Checked by the model, not by a human.')).toBeInTheDocument();
  });

  it('verdict flags without remarks — neither OK nor «Model flags (0)»', () => {
    render(<ItemCheck verdict="flags" remarks={[]} review={answered} />);
    expect(screen.queryByText('Model check: OK')).toBeNull();
    expect(screen.queryByText(/Model flags/)).toBeNull();
  });

  it('verdict flags with remarks — «Model flags (N)» and the list', () => {
    render(<ItemCheck verdict="flags" remarks={[remark]} review={answered} />);
    expect(screen.getByText('Model flags (1)')).toBeInTheDocument();
    expect(screen.getByText(/Jon: Use John \(code check\)/)).toBeInTheDocument();
    expect(screen.queryByText('Model check: OK')).toBeNull();
  });

  it('no model check — the reason instead of «checked by the model»', () => {
    render(<ItemCheck verdict="ok" remarks={[]} review={{ kind: 'unavailable', model: null }} />);
    expect(
      screen.getByText('Model check: not done (the reviewer model is unavailable).')
    ).toBeInTheDocument();
    expect(screen.queryByText('Checked by the model, not by a human.')).toBeNull();
  });

  it('failed — no mark at all', () => {
    const { container } = render(
      <ItemCheck verdict="failed" remarks={[remark]} review={answered} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
