import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { copyPromptText } from '@/lib/admin/copy-prompt-text';
import { usePromptInputsSource } from '@/lib/hooks/usePromptInputsSource';

/**
 * Общий источник «Вводных» вкладок Analysis и World (круг /fix 2, п.10): главы, досье только у
 * `admin`, досье исходника на другом языке, устаревшее досье; запись в буфер без `clipboard`.
 */

const q = vi.hoisted(() => ({
  chapters: { data: undefined as unknown, error: null as Error | null },
  dossier: { data: undefined as unknown, isError: false },
  source: { data: undefined as unknown, isError: false },
  bookVersionArgs: [] as unknown[],
}));

vi.mock('@/api/hooks', () => ({
  useChapterTitles: () => q.chapters,
  useVersionDossier: () => q.dossier,
  useBookVersion: (...args: unknown[]) => {
    q.bookVersionArgs = args;
    return q.source;
  },
}));

const CHAPTERS = { items: [{ number: 1, title: 'One' }], pagination: { total: 1 } };
const dossier = (patch: Record<string, unknown> = {}) => ({
  status: 'ready',
  fresh: true,
  sourceVersionId: 'v1',
  data: { characters: [], entities: [], motifs: [] },
  ...patch,
});

const prepare = (isAdmin = true) =>
  renderHook(() => usePromptInputsSource('v1', 'ru', isAdmin)).result.current.prepare(
    'wait dossier'
  );

describe('usePromptInputsSource', () => {
  beforeEach(() => {
    q.chapters = { data: CHAPTERS, error: null };
    q.dossier = { data: dossier(), isError: false };
    q.source = { data: undefined, isError: false };
  });

  it('chapters failed — error; not loaded — wait', () => {
    q.chapters = { data: undefined, error: new Error('boom') };
    expect(prepare()).toEqual({ state: 'error', message: 'Could not load chapters: boom' });
    q.chapters = { data: undefined, error: null };
    expect(prepare()).toEqual({ state: 'wait', message: 'Chapters are not loaded yet' });
  });

  it('a ready fresh dossier of this version goes in with the version language', () => {
    const source = prepare();
    expect(source).toMatchObject({ state: 'ready', dossierLanguage: 'ru', withoutDossier: null });
    expect(source.state === 'ready' && source.dossier).toBeTruthy();
  });

  it('a foreign dossier (translated version): its language comes from the source version; loading — wait', () => {
    q.dossier = { data: dossier({ sourceVersionId: 'src' }), isError: false };
    expect(prepare()).toEqual({ state: 'wait', message: 'wait dossier' });
    expect(q.bookVersionArgs).toEqual(['src', { enabled: true }]);
    q.source = { data: { language: 'en' }, isError: false };
    expect(prepare()).toMatchObject({
      state: 'ready',
      dossierLanguage: 'en',
      withoutDossier: null,
    });
    q.source = { data: undefined, isError: true };
    expect(prepare()).toMatchObject({
      state: 'ready',
      dossier: undefined,
      withoutDossier: 'could not load the language of the dossier',
    });
  });

  it('an outdated dossier is not used, and the editor is told so', () => {
    q.dossier = { data: dossier({ fresh: false }), isError: false };
    expect(prepare()).toMatchObject({
      state: 'ready',
      dossier: undefined,
      withoutDossier: 'the dossier is outdated',
    });
  });

  it('the dossier failed to load — copy without it; not admin — no dossier silently', () => {
    q.dossier = { data: undefined, isError: true };
    expect(prepare()).toMatchObject({ withoutDossier: 'could not load the dossier' });
    q.dossier = { data: undefined, isError: false };
    expect(prepare(false)).toMatchObject({
      state: 'ready',
      dossier: undefined,
      withoutDossier: null,
    });
  });
});

describe('copyPromptText', () => {
  it('without navigator.clipboard (http) — refusal, not an exception', () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    const onCopied = vi.fn();
    const onFailed = vi.fn();
    try {
      expect(() => copyPromptText('x', onCopied, onFailed)).not.toThrow();
    } finally {
      if (original) Object.defineProperty(navigator, 'clipboard', original);
    }
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onCopied).not.toHaveBeenCalled();
  });
});
