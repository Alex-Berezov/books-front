import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RunReportModal } from '@/components/admin/translation-run/RunReportModal';
import type { TranslationReportLanguage, TranslationRunReport } from '@/types/api-schema';

/** F05-7: отчёт запуска (§2.4) — черновик, главы, итоговая проверка, находки, стоимость. */

const hooks = vi.hoisted(() => ({
  report: undefined as unknown,
  isLoading: false,
  error: null as unknown,
}));

vi.mock('@/api/hooks', () => ({
  useTranslationRunReport: () => ({
    data: hooks.report,
    isLoading: hooks.isLoading,
    isError: hooks.error !== null,
    error: hooks.error,
  }),
}));

const reportLanguage = (over: Partial<TranslationReportLanguage>): TranslationReportLanguage => ({
  language: 'es',
  status: 'done',
  reason: null,
  reasonText: null,
  draftVersionId: 'draft-es',
  draftCreatedAt: '2026-10-24T00:00:00.000Z',
  flaggedChunks: 1,
  flaggedChapters: 1,
  authorFromGlossary: null,
  chunks: { total: 4, retries: 2, flagged: [{ reason: 'CHUNK_FLAGGED', count: 1 }] },
  chapters: [
    {
      number: 2,
      status: 'flagged',
      flagReason: 'SEAM_BROKEN',
      seamIndex: 1,
      length: 100,
      lengthLimit: 500,
      chapterId: 'c2',
      rewriteRefusal: null,
      findings: [{ code: 'GLOSSARY_SOURCE_FORM', form: 'Ana', target: 'Anita' }],
    },
  ],
  notWrittenChapters: [],
  writtenChapters: 0,
  takenChapters: [],
  finalCheck: { status: 'skipped', missingChapters: [], chaptersChecked: 0 },
  ...over,
});

const report = (languages: TranslationReportLanguage[]): TranslationRunReport => ({
  id: 'r1',
  bookVersionId: 'v1',
  languages,
  costs: [{ stage: 'translate', model: 'a/b', calls: 3, costUsd: '1.20000000' }],
  inFlight: { calls: 0, reservedUsd: '0' },
  totalUsd: '1.20000000',
});

describe('Отчёт запуска (F05-7)', () => {
  it('ссылка на черновик, ноль записанных глав явно, повторы, находки с подписями, итог', () => {
    hooks.report = report([reportLanguage({})]);
    render(<RunReportModal runId="r1" lang="en" onClose={vi.fn()} />);

    expect(screen.getByRole('link', { name: 'Open draft' })).toHaveAttribute(
      'href',
      '/admin/en/books/versions/draft-es'
    );
    expect(screen.getByText(/Chapters written: 0\./)).toBeInTheDocument();
    expect(screen.getByText(/Pieces: 4, retries: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Final check: not performed/)).toBeInTheDocument();
    expect(screen.getByText(/Chapter 2: the text breaks on a seam/)).toBeInTheDocument();
    expect(
      screen.getByText(/a name stayed in the source spelling — Ana → Anita/)
    ).toBeInTheDocument();
    expect(screen.getAllByText('$1.2')).toHaveLength(2);
  });

  it('F05-7v: находка до повтора или правки приглушена, отказ перезаписи — подписью', () => {
    hooks.report = report([
      reportLanguage({
        chapters: [
          {
            number: 3,
            status: 'written',
            flagReason: null,
            seamIndex: null,
            length: 100,
            lengthLimit: 500,
            chapterId: 'c3',
            rewriteRefusal: 'VERSION_NOT_DRAFT',
            findings: [{ code: 'SEAM_BROKEN', seam: 1, stale: true }],
          },
        ],
      }),
    ]);
    render(<RunReportModal runId="r1" lang="en" onClose={vi.fn()} />);

    const stale = screen.getByText(/the text breaks on a seam \(seam 1\) — before a retry or edit/);
    expect(stale.className).toMatch(/stale/);
    expect(
      screen.getByText(/Not rewritten after a retry or edit: the version is no longer a draft/)
    ).toBeInTheDocument();
  });

  it('без черновика — так и сказано; итоговая проверка ещё не дошла', () => {
    hooks.report = report([
      reportLanguage({
        draftVersionId: null,
        finalCheck: { status: 'pending', missingChapters: [], chaptersChecked: 0 },
      }),
    ]);
    render(<RunReportModal runId="r1" lang="en" onClose={vi.fn()} />);

    expect(screen.getByText(/No draft version\./)).toBeInTheDocument();
    expect(screen.getByText(/Final check: not reached yet/)).toBeInTheDocument();
  });

  it('F05-17: автор не из глоссария помечен только при черновике; из глоссария и null — молчание', () => {
    const warning = /Author name in the draft: not from the glossary/;
    hooks.report = report([reportLanguage({ authorFromGlossary: false })]);
    const { unmount } = render(<RunReportModal runId="r1" lang="en" onClose={vi.fn()} />);
    expect(screen.getByText(warning)).toBeInTheDocument();
    unmount();

    for (const over of [
      { authorFromGlossary: true },
      { authorFromGlossary: null },
      { authorFromGlossary: false, status: 'failed' as const, draftVersionId: null },
    ]) {
      hooks.report = report([reportLanguage(over)]);
      const view = render(<RunReportModal runId="r1" lang="en" onClose={vi.fn()} />);
      expect(screen.queryByText(/Author name/)).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it('упавший язык — та же подпись, что в блоке; отказ отчёта — плашка', () => {
    hooks.report = report([
      reportLanguage({ status: 'failed', reason: 'VERSION_EXISTS', draftVersionId: null }),
    ]);
    const { unmount } = render(<RunReportModal runId="r1" lang="en" onClose={vi.fn()} />);
    expect(screen.getByText('ES: failed')).toBeInTheDocument();
    expect(screen.getByText('A version in this language already exists.')).toBeInTheDocument();
    unmount();

    hooks.report = undefined;
    hooks.error = new Error('boom');
    render(<RunReportModal runId="r1" lang="en" onClose={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('The request failed');
    hooks.error = null;
  });
});
