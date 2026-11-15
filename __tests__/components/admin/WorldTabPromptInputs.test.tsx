import { fireEvent, screen, waitFor } from '@testing-library/react';
import { HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installWorldApi, renderWorldTab, rowOf, type WorldApi } from '../../helpers/worldApi';

/**
 * F08-1: «Copy prompt inputs» вкладки World (`product.md` §17 п.5; круг /fix 2, п.10): главы ещё
 * грузятся — копировать рано; главы не загрузились — ошибка; анализ не загрузился — копия без его
 * героев с предупреждением; буфер отказал — ошибка, а не исключение.
 */

vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() => Promise.resolve({ user: { id: 'u1' }, expires: '2099-01-01' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const snack = vi.hoisted(() => vi.fn());
vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: snack }) }));

describe('WorldTab prompt inputs (F08-1)', () => {
  let rec: WorldApi;
  const writeText = vi.fn();
  const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

  beforeEach(() => {
    snack.mockReset();
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    rec = installWorldApi();
  });

  afterEach(() => {
    if (original) Object.defineProperty(navigator, 'clipboard', original);
    else Reflect.deleteProperty(navigator, 'clipboard');
  });

  const copy = async () => {
    await rowOf('sonya');
    fireEvent.click(screen.getByRole('button', { name: 'Copy prompt inputs' }));
  };

  it('copies chapters and the heroes of the analysis and says so', async () => {
    rec.analysisReply = () =>
      HttpResponse.json({ characters: [{ key: 'raskolnikov', name: 'Rodion', role: 'main' }] });
    renderWorldTab(true);
    await rowOf('sonya');
    // Копия — когда главы и анализ пришли: до того кнопка отвечает «рано».
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy prompt inputs' }));
      expect(writeText).toHaveBeenCalled();
    });
    const text = String(writeText.mock.calls.at(-1)?.[0]);
    expect(text).toContain('1 — One');
    expect(text).toContain('raskolnikov — Rodion — main');
    await waitFor(() =>
      expect(snack).toHaveBeenLastCalledWith('Prompt inputs copied', { variant: 'success' })
    );
  });

  it('chapters are still loading — too early to copy, nothing is written', async () => {
    rec.chaptersReply = () => new Promise<Response>(() => undefined);
    renderWorldTab(false);
    await copy();
    expect(snack).toHaveBeenLastCalledWith('Chapters are not loaded yet', { variant: 'warning' });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('chapters failed — an error, nothing is written', async () => {
    rec.chaptersReply = () =>
      HttpResponse.json({ statusCode: 404, message: 'Version not found' }, { status: 404 });
    renderWorldTab(false);
    await rowOf('sonya');
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy prompt inputs' }));
      expect(snack).toHaveBeenLastCalledWith('Could not load chapters: Version not found', {
        variant: 'error',
      });
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('the analysis failed — no heroes section at all, and the editor is told', async () => {
    rec.analysisReply = () =>
      HttpResponse.json({ statusCode: 404, message: 'no analysis' }, { status: 404 });
    renderWorldTab(true);
    await rowOf('sonya');
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy prompt inputs' }));
      expect(snack).toHaveBeenLastCalledWith(
        'Prompt inputs copied without: could not load the analysis heroes',
        { variant: 'warning' }
      );
    });
    const text = String(writeText.mock.calls.at(-1)?.[0]);
    expect(text).toContain('1 — One');
    expect(text).not.toContain('Герои анализа');
  });

  it('no analysis (null) — the heroes section says «нет», no warning', async () => {
    renderWorldTab(true);
    await rowOf('sonya');
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy prompt inputs' }));
      expect(snack).toHaveBeenLastCalledWith('Prompt inputs copied', { variant: 'success' });
    });
    expect(String(writeText.mock.calls.at(-1)?.[0])).toContain(
      'Герои анализа этой версии (ключ — имя — роль):\nнет'
    );
  });

  it('a content manager copies without the dossier and is told it is admin only', async () => {
    renderWorldTab(false);
    await rowOf('sonya');
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy prompt inputs' }));
      expect(snack).toHaveBeenLastCalledWith(
        'Prompt inputs copied without: the dossier (admin only)',
        { variant: 'warning' }
      );
    });
    expect(String(writeText.mock.calls.at(-1)?.[0])).not.toContain('досье');
  });

  it('the clipboard refused — an error, not an exception', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    renderWorldTab(false);
    await rowOf('sonya');
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy prompt inputs' }));
      expect(snack).toHaveBeenLastCalledWith('Could not copy to clipboard', { variant: 'error' });
    });
  });
});
