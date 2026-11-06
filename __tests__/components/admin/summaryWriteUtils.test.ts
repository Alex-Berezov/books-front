import { describe, expect, it } from 'vitest';
import { reviewSkippedText } from '@/components/admin/books/ContentDraft/contentDraft.utils';
import {
  acceptAllStopOf,
  acceptedIndexesOf,
  blockingSectionOf,
  chapterChangeText,
  fieldsOf,
  fullWaitsFor,
  itemsToReloadAfterAcceptAll,
  mayHaveWritten,
  progressText,
  reasonText,
  refusalText,
  refusalTextOfCode,
  sortItems,
  startLossText,
  writeEstimateText,
} from '@/components/admin/books/SummaryTab/SummaryWrite/summaryWrite.utils';
import { DOSSIER_REFUSED_TEXT } from '@/components/admin/translation-run/translationRun.utils';
import { ApiError } from '@/types/api';
import type {
  LlmOperation,
  SummaryWrite,
  SummaryWriteEstimate,
  SummaryWriteItem,
} from '@/types/api-schema';

/** F06-3: подписи хода «Write Summary» — ход, причины, проверка моделью, оценка, 409. */

const operation = (patch: Partial<LlmOperation> = {}): LlmOperation => ({
  id: 'op-1',
  kind: 'draft',
  status: 'active',
  pauseReason: null,
  bookVersionId: 'v1',
  limitUsd: '2',
  reservedUsd: '0',
  spentUsd: '0',
  createdAt: '2026-11-02T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
  ...patch,
});

const item = (patch: Partial<SummaryWriteItem> = {}): SummaryWriteItem => ({
  index: 0,
  target: 'section',
  number: 1,
  title: 'A',
  readerChapter: 1,
  html: '<p>x</p>',
  attempt: 1,
  verdict: 'ok',
  remarks: [],
  review: { kind: 'answered', model: 'm' },
  outcome: 'proposed',
  failedReason: null,
  authorModel: 'a',
  regenFailedReason: null,
  regenerating: false,
  regenOperationId: null,
  regenOperationStatus: null,
  regenPauseReason: null,
  ...patch,
});

const run = (patch: Partial<SummaryWrite> = {}): SummaryWrite => ({
  id: 'd1',
  bookVersionId: 'v1',
  status: 'building',
  language: 'en',
  failedReason: null,
  waitingFor: null,
  operation: operation(),
  plannedSections: 12,
  sectionsDone: 3,
  owns: { sections: true, full: true, brief: true },
  items: [],
  chapterChanges: [],
  createdAt: '2026-11-02T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
  ...patch,
});

const estimate = (patch: Partial<SummaryWriteEstimate> = {}): SummaryWriteEstimate => ({
  dossier: null,
  glossary: null,
  sections: null,
  stageUsd: '2.9',
  upperBound: false,
  suggestedLimitUsd: '4.35',
  ...patch,
});

describe('summaryWrite.utils', () => {
  it('progress: the dossier, the glossary, the unknown plan, sections N of M, pause', () => {
    expect(progressText(run({ waitingFor: 'dossier' }))).toBe('Building the dossier first…');
    expect(progressText(run({ waitingFor: 'glossary' }))).toBe(
      'Building the glossary of this language first…'
    );
    expect(progressText(run({ plannedSections: null }))).toBe(
      'Writing: waiting for the plan of sections…'
    );
    expect(progressText(run())).toBe('Writing: sections 3 of 12…');
    expect(
      progressText(
        run({ operation: operation({ status: 'paused', pauseReason: 'CEILING_REACHED' }) })
      )
    ).toContain('Paused: the spending ceiling is reached');
  });

  it('reasons: shared with the draft, own codes of the run, an unknown code as is, none', () => {
    expect(reasonText('DRAFT_TOO_LONG')).toBe(
      'the text is too long for the model or for the field'
    );
    expect(reasonText('SUMMARY_WRITE_REFUSED')).toBe('the field did not take the text');
    expect(reasonText('DRAFT_NO_PLAN')).toBe('the dossier has no plan of sections');
    expect(reasonText('SOMETHING_NEW')).toBe('SOMETHING_NEW');
    expect(reasonText(null)).toBe('unknown reason');
  });

  it('model check not done: every kind has its reason; answered — no line; no review — a plain line', () => {
    const kinds = ['not_independent', 'too_long', 'invalid', 'no_provider', 'unavailable'] as const;
    const texts = kinds.map((kind) => reviewSkippedText({ kind, model: null }));
    for (const text of texts) expect(text).toMatch(/^Model check: not done \(.+\)\.$/);
    expect(new Set(texts).size).toBe(kinds.length);
    expect(reviewSkippedText({ kind: 'answered', model: 'm' })).toBeNull();
    expect(reviewSkippedText(null)).toBe('Model check: not done.');
  });

  it('chapter change: one chapter, a range, a range that cannot be worked out', () => {
    expect(
      chapterChangeText({
        code: 'SUMMARY_CHAPTER_CHANGE',
        message: 'x',
        number: 3,
        covers: null,
        willCover: { from: 5, to: 5 },
        sameChapterSections: [],
      })
    ).toBe(
      'Section 3 now covers chapters that cannot be worked out, will cover chapter 5. Accept it anyway?'
    );
  });

  it('estimate: dossier and glossary first, upper bound, a known plan, a refused dossier', () => {
    const line = { estimateUsd: '0.5', suggestedLimitUsd: '0.75', upperBound: false };
    const full = writeEstimateText(
      estimate({
        dossier: { ...line, refusedTooLong: false },
        glossary: line,
        upperBound: true,
      })
    );
    expect(full).toContain('The dossier is built first: up to $0.5.');
    expect(full).toContain('The glossary of this language is built first: up to $0.5.');
    expect(full).toContain('(the plan is not known yet: one section per chapter)');
    expect(full).toContain('Operation limit: $4.35.');
    expect(writeEstimateText(estimate({ sections: 12 }))).toContain(
      'The summary: up to $2.9 (12 sections, the Summary and the very short summary).'
    );
    expect(writeEstimateText(estimate())).toContain('The summary: up to $2.9.');
    const refused = writeEstimateText(estimate({ dossier: { ...line, refusedTooLong: true } }));
    expect(refused).toContain('will not be built');
    expect(refused).not.toContain('built first');
  });

  it('accepted indexes: only integers of the body are taken; another error — none', () => {
    const error = new ApiError({
      statusCode: 409,
      message: 'x',
      data: { code: 'SUMMARY_FIELD_CHANGED', acceptedIndexes: [0, '1', null, 2.5, 3] },
    });
    expect(acceptedIndexesOf(error)).toEqual([0, 3]);
    expect(
      acceptedIndexesOf(
        new ApiError({ statusCode: 409, message: 'x', data: { acceptedIndexes: 'all' } })
      )
    ).toBeNull();
    expect(acceptedIndexesOf(new Error('network'))).toBeNull();
  });

  it('order: sections by number (no number first), then the full, then the very short summary', () => {
    const sorted = sortItems([
      item({ index: 0, target: 'brief', number: null }),
      item({ index: 1, target: 'full', number: null }),
      item({ index: 2, number: 2 }),
      item({ index: 3, number: null }),
      item({ index: 4, number: 1 }),
    ]);
    expect(sorted.map((i) => i.index)).toEqual([3, 4, 2, 1, 0]);
  });

  it('Accept all stopped at the first proposal not accepted, in the server order', () => {
    const items = [
      item({ index: 0, target: 'full', number: null }),
      item({ index: 1, number: 2 }),
      item({ index: 2, number: 1 }),
      item({ index: 3, number: 3, regenerating: true }),
    ];
    expect(acceptAllStopOf(items, [2])?.index).toBe(1);
    expect(acceptAllStopOf(items, [2, 1, 0])).toBeNull();
  });

  it('fields of the form: the full and the very short summary, not the sections', () => {
    expect(fieldsOf([item(), item({ target: 'full' }), item({ target: 'brief' })])).toEqual([
      'full',
      'brief',
    ]);
  });

  it('the start over a ready run names what is lost; nothing pending — nothing', () => {
    expect(startLossText(null)).toBe('');
    expect(startLossText(run({ status: 'failed', items: [item()] }))).toBe('');
    expect(startLossText(run({ status: 'ready', items: [item({ outcome: 'written' })] }))).toBe('');
    expect(
      startLossText(
        run({
          status: 'ready',
          items: [
            item(),
            item({ index: 1, outcome: 'waiting' }),
            item({ index: 2, outcome: 'written', regenerating: true }),
          ],
        })
      )
    ).toBe(
      'This replaces the current run: 2 proposals not accepted will be discarded, 1 regeneration will be cancelled.'
    );
  });

  it('the section a waiting section waits for: the first failed before it, else the one before', () => {
    const items = [
      item({ index: 0, number: 1, verdict: 'ok' }),
      item({ index: 1, number: 2, verdict: 'failed' }),
      item({ index: 2, number: 3, verdict: 'failed' }),
      item({ index: 3, number: 4, outcome: 'waiting' }),
      item({ index: 4, number: 6, verdict: 'failed' }),
    ];
    expect(blockingSectionOf(items, items[3])).toBe(2);
    expect(blockingSectionOf([item({ number: 5, outcome: 'waiting' })], item({ number: 5 }))).toBe(
      4
    );
  });

  it('the full summary waits for the first failed section until the run has a full text', () => {
    const failed = [item({ number: 3, verdict: 'failed' }), item({ number: 2, verdict: 'failed' })];
    expect(fullWaitsFor(failed)).toBe(2);
    expect(fullWaitsFor([...failed, item({ target: 'full', number: null, html: '' })])).toBe(2);
    expect(fullWaitsFor([...failed, item({ target: 'full', number: null })])).toBeNull();
    expect(fullWaitsFor([item()])).toBeNull();
  });

  it('any 409 but SUMMARY_FIELD_CHANGED wrote nothing; the rest may have written', () => {
    const code = (c: string) => new ApiError({ statusCode: 409, message: 'x', data: { code: c } });
    for (const c of [
      'ACCEPT_ALL_CHAPTER_CHANGE',
      'SUMMARY_WRITE_NOT_READY',
      'SUMMARY_CHAPTER_CHANGE',
      'SUMMARY_ITEM_NOT_PROPOSED',
      'SUMMARY_REGEN_IN_PROGRESS',
    ]) {
      expect(mayHaveWritten(code(c))).toBe(false);
    }
    expect(mayHaveWritten(code('SUMMARY_FIELD_CHANGED'))).toBe(true);
    expect(mayHaveWritten(new ApiError({ statusCode: 502, message: 'bad gateway' }))).toBe(true);
    expect(mayHaveWritten(new Error('offline'))).toBe(true);
  });

  it('what to reload after a refusal of «Accept all»: the list of the body decides', () => {
    const items = [
      item({ index: 0 }),
      item({ index: 1, number: 2 }),
      item({ index: 4, target: 'full', number: null }),
    ];
    const err = (data: Record<string, unknown>, statusCode = 409) =>
      new ApiError({ statusCode, message: 'x', data });
    const idx = (list: SummaryWriteItem[]) => list.map((i) => i.index);
    // Принят 0; встали на 1 (поле изменено) — перечитываются принятые и тот, на котором встали.
    expect(
      idx(
        itemsToReloadAfterAcceptAll(
          err({ code: 'SUMMARY_FIELD_CHANGED', acceptedIndexes: [0] }),
          items,
          items
        )
      )
    ).toEqual([0, 1]);
    // Другой код с принятым: встали на 1, но его поле не менялось — только принятое.
    expect(
      idx(
        itemsToReloadAfterAcceptAll(
          err({ code: 'SUMMARY_ITEM_NOT_PROPOSED', acceptedIndexes: [0] }),
          items,
          items
        )
      )
    ).toEqual([0]);
    // Пустой список и не «поле изменено»: ничего не записано.
    expect(
      itemsToReloadAfterAcceptAll(
        err({ code: 'SUMMARY_WRITE_NOT_READY', acceptedIndexes: [] }),
        items,
        items
      )
    ).toEqual([]);
    // Списка нет: 409 — до записи; сеть и 5xx — неизвестно, все затронутые.
    expect(
      itemsToReloadAfterAcceptAll(err({ code: 'ACCEPT_ALL_CHAPTER_CHANGE' }), items, items)
    ).toEqual([]);
    expect(itemsToReloadAfterAcceptAll(new Error('offline'), items, items)).toEqual(items);
    expect(itemsToReloadAfterAcceptAll(err({}, 502), items, items)).toEqual(items);
  });

  it('Accept all stop: a waiting section before the first proposal makes it unknown (F06-5c)', () => {
    const waiting = item({ index: 0, outcome: 'waiting' });
    const fullItem = item({ index: 4, target: 'full', number: null });
    // `settle` мог сделать ждущий раздел предложением, и он встал первым: текст не угадывается.
    expect(acceptAllStopOf([waiting, fullItem], [])).toBeNull();
    expect(acceptAllStopOf([item({ index: 0, outcome: 'accepted' }), fullItem], [])).toBe(fullItem);
    const err = new ApiError({
      statusCode: 409,
      message: 'x',
      data: { code: 'SUMMARY_FIELD_CHANGED', acceptedIndexes: [] },
    });
    // Текст остановки не выведен — поле могло измениться у любого непринятого: перечитать все.
    expect(itemsToReloadAfterAcceptAll(err, [fullItem], [waiting, fullItem])).toEqual([fullItem]);
  });

  it('refusals of the run have words', () => {
    for (const c of [
      'DRAFT_IN_PROGRESS',
      'SOURCE_HAS_NO_CHAPTERS',
      'SUMMARY_REGEN_IN_PROGRESS',
      'SUMMARY_ITEM_UNKNOWN',
      'SUMMARY_SECTIONS_UNFINISHED',
      'SUMMARY_FULL_UNFINISHED',
    ]) {
      expect(refusalTextOfCode(c)).toMatch(/\w+ \w+/);
    }
    expect(refusalTextOfCode('NO_SUCH_CODE')).toBeUndefined();
    // Свой текст хода, а не заготовки («у версии нет текста глав»).
    expect(reasonText('DRAFT_INPUT_MISSING')).toBe(
      'the chapters have no text, or the dossier is gone'
    );
  });

  it('DOSSIER_TOO_LONG of the start is the common refused dossier text', () => {
    expect(
      refusalText(
        new ApiError({ statusCode: 409, message: 'x', data: { code: 'DOSSIER_TOO_LONG' } })
      )
    ).toBe(DOSSIER_REFUSED_TEXT);
  });
});
