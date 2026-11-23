import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorldSpoilerGate } from '@/app/[lang]/book/[slug]/wiki/WorldSpoilerGate';

/**
 * Спойлер-остров страницы сущности (`F08-10b`, решения `F08 | F08-10` (4) и `F08 | F08-10b`).
 *
 * 🔴 Посадки на четыре дефекта: порог `>` вместо `>=` (глава читателя видна), свёртка без
 * `target === 'server'` (аноним и `local` не сворачивают), свёртка до гидратации (серверный
 * HTML один для всех, кэш React Query не меняет первый рендер), раскрытие одним нажатием.
 */

const sessionState: { data: unknown; status: string } = { data: null, status: 'unauthenticated' };
const progressState: { data: unknown; enabled: boolean | undefined } = {
  data: undefined,
  enabled: undefined,
};

vi.mock('next-auth/react', () => ({
  useSession: () => sessionState,
}));

vi.mock('@/api/hooks/useProgress', () => ({
  useProgress: (_versionId: string, _userId?: string, options?: { enabled?: boolean }) => {
    progressState.enabled = options?.enabled;
    // Как у React Query: выключенный запрос данных не отдаёт, если их нет в кэше.
    return { data: progressState.data };
  },
}));

const signedIn = () => {
  sessionState.data = { user: { id: 'u1' } };
  sessionState.status = 'authenticated';
};

const gate = (chapter: number) => (
  <WorldSpoilerGate
    versionId="v1"
    chapter={chapter}
    hiddenLabel={`Opens after chapter ${chapter}`}
    revealLabel="reveal now"
  >
    <p>Scene in chapter {chapter}</p>
  </WorldSpoilerGate>
);

const body = (chapter: number) => screen.getByText(`Scene in chapter ${chapter}`).parentElement!;

beforeEach(() => {
  sessionState.data = null;
  sessionState.status = 'unauthenticated';
  progressState.data = undefined;
  progressState.enabled = undefined;
});

afterEach(cleanup);

describe('спойлер-остров страницы сущности (F08-10b)', () => {
  it('глава элемента больше главы читателя - свёрнут с подписью; глава читателя и раньше - раскрыты', () => {
    signedIn();
    progressState.data = { chapterNumber: 3 };
    render(
      <>
        {gate(5)}
        {gate(3)}
        {gate(2)}
      </>
    );
    expect(body(5).hidden).toBe(true);
    expect(screen.getByText(/Opens after chapter 5/)).toBeInTheDocument();
    expect(body(3).hidden).toBe(false);
    expect(body(2).hidden).toBe(false);
    expect(screen.queryByText(/Opens after chapter 3/)).toBeNull();
    expect(progressState.enabled).toBe(true);
    // Текст свёрнутого элемента остаётся в DOM - он же в серверном HTML.
    expect(screen.getByText('Scene in chapter 5')).toBeInTheDocument();
  });

  it('одно нажатие раскрывает только этот элемент', () => {
    signedIn();
    progressState.data = { chapterNumber: 1 };
    render(
      <>
        {gate(4)}
        {gate(6)}
      </>
    );
    const buttons = screen.getAllByRole('button', { name: 'reveal now' });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);
    expect(body(4).hidden).toBe(false);
    expect(screen.queryByText(/Opens after chapter 4/)).toBeNull();
    expect(body(6).hidden).toBe(true);
  });

  it('кнопка связана с телом и подписью; после нажатия фокус - в раскрытом элементе', () => {
    signedIn();
    progressState.data = { chapterNumber: 1 };
    render(gate(4));
    const button = screen.getByRole('button', { name: 'reveal now' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-controls', body(4).id);
    expect(button).toHaveAccessibleDescription('Opens after chapter 4');
    fireEvent.click(button);
    expect(document.activeElement).toBe(screen.getByText('Scene in chapter 4'));
  });

  it('noticeClassName - ячейка-обёртка вокруг подписи, сама подпись - одной строкой; без него - только подпись', () => {
    signedIn();
    progressState.data = { chapterNumber: 1 };
    render(
      <>
        <WorldSpoilerGate
          versionId="v1"
          chapter={4}
          hiddenLabel="Quote after 4"
          revealLabel="reveal quote"
          noticeClassName="quote-card"
        >
          <blockquote>Quote text</blockquote>
        </WorldSpoilerGate>
        {gate(5)}
      </>
    );
    const quoteNotice = screen.getByText('Quote after 4').closest('p')!;
    expect(quoteNotice.parentElement).toHaveClass('quote-card');
    expect(quoteNotice).not.toHaveClass('quote-card');
    expect(quoteNotice).toContainElement(screen.getByRole('button', { name: 'reveal quote' }));
    const stageNotice = screen.getByText('Opens after chapter 5').closest('p')!;
    expect(stageNotice.parentElement?.className ?? '').not.toContain('quote-card');
  });

  it('аноним, сессия ещё грузится, протухшая сессия и сессия без id - ничего не сворачивается, запрос выключен', () => {
    progressState.data = { chapterNumber: 1 };
    for (const state of [
      { data: null, status: 'unauthenticated' },
      { data: null, status: 'loading' },
      { data: { user: { id: 'u1' }, error: 'RefreshAccessTokenError' }, status: 'authenticated' },
      // Сессия без `user.id`: `target` - server, но владельца для ключа кэша нет.
      { data: { user: {} }, status: 'authenticated' },
    ]) {
      sessionState.data = state.data;
      sessionState.status = state.status;
      render(gate(5));
      expect(body(5).hidden).toBe(false);
      expect(screen.queryByRole('button')).toBeNull();
      expect(progressState.enabled).toBe(false);
      cleanup();
    }
  });

  it('прогресса по версии нет (null) или запрос не ответил - всё раскрыто', () => {
    signedIn();
    for (const data of [null, undefined, { chapterNumber: null }]) {
      progressState.data = data;
      render(gate(5));
      expect(body(5).hidden).toBe(false);
      expect(screen.queryByRole('button')).toBeNull();
      cleanup();
    }
  });

  it('серверный рендер раскрыт даже с прогрессом в кэше; свёртка - только после гидратации', async () => {
    signedIn();
    progressState.data = { chapterNumber: 1 };
    const html = renderToString(gate(5));
    const container = document.createElement('div');
    container.innerHTML = html;
    expect(container.textContent).toContain('Scene in chapter 5');
    expect(container.querySelector('[hidden]')).toBeNull();
    expect(container.textContent).not.toContain('Opens after chapter');

    document.body.appendChild(container);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { hydrateRoot } = await import('react-dom/client');
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, gate(5));
      });
      // Расхождение разметки при гидратации React пишет в console.error.
      expect(errors).not.toHaveBeenCalled();
    } finally {
      errors.mockRestore();
    }
    expect(container.querySelector('[hidden]')).not.toBeNull();
    expect(container.textContent).toContain('Opens after chapter 5');
    act(() => root?.unmount());
    container.remove();
  });
});
