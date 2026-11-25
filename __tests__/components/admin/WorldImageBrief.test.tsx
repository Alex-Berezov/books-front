import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BRIEF_NO_APPEARANCE,
  BRIEF_NOT_WRITTEN,
  BRIEF_STALE,
  imageBriefState,
  WorldImageBrief,
} from '@/components/admin/books/WorldTab/WorldImageBrief';
import type { BookWorldEntity } from '@/types/api-schema';
import { detail } from '../../helpers/worldApi';

/**
 * F08-11d-2, решение `F08 | F08-11d-2` (показ ТЗ): раздел ТЗ во вкладке World — только по данным
 * открытой версии. Не герой `main`/`secondary` — раздела нет; без «Внешности» — причина; есть
 * «Внешность», нет ТЗ — подсказка; есть ТЗ — текст и копирование. Принятая картинка не влияет.
 */

const enqueueSnackbar = vi.fn();
vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar }) }));

const BRIEF = 'Square 1:1 portrait of Sonya Marmeladova from Crime and Punishment by Dostoevsky.';

const entity = (
  patch: Partial<BookWorldEntity> = {},
  imageBrief: string | null = BRIEF,
  imageBriefStale = false
): BookWorldEntity => {
  const base = detail('sonya').entity;
  return {
    ...base,
    role: 'main',
    appearance: 'A silent girl in a shawl.',
    ...patch,
    editor: { ...base.editor!, imageBrief, imageBriefStale },
  };
};

afterEach(() => {
  enqueueSnackbar.mockReset();
  vi.unstubAllGlobals();
});

describe('imageBriefState (F08-11d-2)', () => {
  it('main и secondary с «Внешностью» и ТЗ — текст ТЗ', () => {
    expect(imageBriefState(entity())).toEqual({ brief: BRIEF, stale: false });
    expect(imageBriefState(entity({ role: 'secondary' }))).toEqual({ brief: BRIEF, stale: false });
    expect(imageBriefState(entity({}, BRIEF, true))).toEqual({ brief: BRIEF, stale: true });
  });

  it('не герой main/secondary — раздела нет', () => {
    expect(imageBriefState(entity({ role: 'minor' }))).toBeNull();
    expect(imageBriefState(entity({ role: null }))).toBeNull();
    expect(imageBriefState(entity({ type: 'pair' }))).toBeNull();
  });

  it('без «Внешности» — причина, даже если ТЗ лежит в записи', () => {
    expect(imageBriefState(entity({ appearance: null }))).toEqual({ reason: BRIEF_NO_APPEARANCE });
    expect(imageBriefState(entity({ appearance: '  ' }))).toEqual({ reason: BRIEF_NO_APPEARANCE });
  });

  it('«Внешность» есть, ТЗ нет (мир до F08-11d-2) — подсказка перезапустить или импортировать', () => {
    expect(imageBriefState(entity({}, null))).toEqual({ reason: BRIEF_NOT_WRITTEN });
    expect(imageBriefState(entity({}, ' '))).toEqual({ reason: BRIEF_NOT_WRITTEN });
  });
});

describe('WorldImageBrief (F08-11d-2)', () => {
  it('показывает ТЗ и копирует его в буфер', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    render(<WorldImageBrief entity={entity()} />);
    expect(screen.getByRole('region', { name: 'Illustration brief' })).toBeInTheDocument();
    expect(screen.getByText(BRIEF)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy brief' }));
    expect(writeText).toHaveBeenCalledWith(BRIEF);
    await waitFor(() =>
      expect(enqueueSnackbar).toHaveBeenCalledWith('Brief copied', { variant: 'success' })
    );
  });

  it('отказ буфера — сообщение об ошибке', async () => {
    const writeText = vi.fn(() => Promise.reject(new Error('denied')));
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    render(<WorldImageBrief entity={entity()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy brief' }));
    await waitFor(() =>
      expect(enqueueSnackbar).toHaveBeenCalledWith('Could not copy to clipboard', {
        variant: 'error',
      })
    );
  });

  // Решение `F08 | F08-11d-2` (отпечаток): ТЗ не по текущей «Внешности» не копируется.
  it('устаревшее ТЗ — текст и пометка, без кнопки копирования', () => {
    render(<WorldImageBrief entity={entity({}, BRIEF, true)} />);
    expect(screen.getByText(BRIEF)).toBeInTheDocument();
    expect(screen.getByText(BRIEF_STALE)).toBeInTheDocument();
    // Решение `F08 | F08-11d-2` о подписи stale: ТЗ может быть и новее записи - подпись без «older».
    expect(screen.queryByText(/older/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy brief' })).not.toBeInTheDocument();
  });

  it('без «Внешности» — причина и без кнопки копирования', () => {
    render(<WorldImageBrief entity={entity({ appearance: null })} />);
    expect(screen.getByText(BRIEF_NO_APPEARANCE)).toBeInTheDocument();
    expect(screen.queryByText(BRIEF)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy brief' })).not.toBeInTheDocument();
  });

  it('второстепенный minor — раздела нет вовсе', () => {
    const { container } = render(<WorldImageBrief entity={entity({ role: 'minor' })} />);
    expect(container).toBeEmptyDOMElement();
  });
});
