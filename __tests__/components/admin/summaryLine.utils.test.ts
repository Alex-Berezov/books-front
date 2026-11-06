import { describe, expect, it } from 'vitest';
import {
  inlinePhrase,
  summaryLineOf,
  summaryReasonText,
  sumSummarySpent,
} from '@/components/admin/translation-run/summaryLine.utils';
import type { TranslationRunSummary } from '@/types/api-schema';

const summary = (over: Partial<TranslationRunSummary> = {}): TranslationRunSummary => ({
  status: 'ready',
  reason: null,
  draftId: 'd1',
  operationStatus: 'done',
  pauseReason: null,
  plannedSections: 5,
  sectionsDone: 5,
  fullDone: true,
  briefDone: true,
  flaggedTexts: 0,
  failedTexts: 0,
  spentUsd: '0.1',
  ...over,
});

const line = (
  s: TranslationRunSummary | null,
  status: 'running' | 'done' | 'failed' | 'cancelled' | 'pending' = 'done'
) => summaryLineOf(true, { status, summary: s });

describe('Подпись раздела языка запуска (F06-5b)', () => {
  it('без Write Summary строки нет', () => {
    expect(summaryLineOf(false, { status: 'done', summary: summary() })).toBeNull();
    expect(summaryLineOf(false, { status: 'running', summary: null })).toBeNull();
  });

  it('раздела ещё нет: язык идёт или ждёт — ждёт перевода; упал или отменён — не начат (Р8)', () => {
    expect(line(null, 'running')).toEqual({
      text: 'Summary: waiting for translation',
      link: null,
    });
    expect(line(null, 'pending')?.text).toBe('Summary: waiting for translation');
    expect(line(null, 'failed')).toEqual({
      text: 'Summary: not started — translation failed',
      link: null,
    });
    expect(line(null, 'cancelled')?.text).toBe('Summary: not started — translation cancelled');
  });

  it('язык done, а раздела нет (черновик удалён) — без строки', () => {
    expect(line(null, 'done')).toBeNull();
  });

  it('pending и ход: секции «N of M», без плана — «N»; пауза и конец операции — со ссылкой', () => {
    expect(line(summary({ status: 'pending' }))).toEqual({
      text: 'Summary: waiting to start',
      link: null,
    });
    expect(
      line(summary({ status: 'building', operationStatus: 'active', sectionsDone: 2 }))
    ).toEqual({ text: 'Summary: writing, sections 2 of 5', link: null });
    expect(
      line(summary({ status: 'building', operationStatus: 'active', plannedSections: null }))?.text
    ).toBe('Summary: writing, sections 5');
    expect(
      line(summary({ status: 'building', operationStatus: 'paused', pauseReason: 'LIMIT_REACHED' }))
    ).toEqual({
      text: 'Summary: paused — its own limit is reached: resume with a higher limit',
      link: 'Open the Summary tab',
    });
    expect(line(summary({ status: 'building', operationStatus: 'cancelled' }))).toEqual({
      text: 'Summary: stopped — its operation was cancelled',
      link: 'Open the Summary tab',
    });
  });

  it('ready: Done, Done с флагами (ссылка), Partly done с числом текстов и недостающим', () => {
    expect(line(summary())).toEqual({ text: 'Summary: done', link: null });
    expect(line(summary({ flaggedTexts: 2 }))).toEqual({
      text: 'Summary: done, texts with model flags: 2',
      link: 'Open the Summary tab',
    });
    expect(line(summary({ failedTexts: 1, fullDone: false, briefDone: false }))).toEqual({
      text: 'Summary: partly done — 1 text failed, no full summary, no very short',
      link: 'Open the Summary tab',
    });
    expect(line(summary({ failedTexts: 3 }))?.text).toBe('Summary: partly done — 3 texts failed');
    expect(line(summary({ briefDone: false }))?.text).toBe('Summary: partly done — no very short');
  });

  it('skipped — причина словами и подсказка со ссылкой на вкладку (Р7)', () => {
    // Ход уже готов или пишется — ручной старт не поможет: ссылка открывает вкладку (F07-3b, PM).
    expect(line(summary({ status: 'skipped', reason: 'AUTOSTART_SKIPPED_EXISTING' }))).toEqual({
      text: 'Summary: not started — the version already has a finished summary run',
      link: 'Open the Summary tab',
    });
    expect(
      line(summary({ status: 'skipped', reason: 'AUTOSTART_SKIPPED_IN_PROGRESS' }))?.link
    ).toBe('Open the Summary tab');
    expect(line(summary({ status: 'skipped', reason: 'LLM_CEILING_REACHED' }))?.link).toBe(
      'Write Summary on the Summary tab'
    );
    expect(line(summary({ status: 'skipped', reason: 'LLM_CEILING_REACHED' }))?.text).toBe(
      'Summary: not started — the spending ceiling is reached: raise it in LLM settings'
    );
  });

  it('failed и discarded: срыв хода словами вкладки; failed ведёт на вкладку', () => {
    expect(line(summary({ status: 'failed', reason: 'DRAFT_NO_PLAN' }))).toEqual({
      text: 'Summary: failed — the dossier has no plan of sections',
      link: 'Open the Summary tab',
    });
    expect(line(summary({ status: 'failed', reason: 'AUTOSTART_CANCELLED' }))?.text).toBe(
      'Summary: failed — the start of the summary was cancelled'
    );
    expect(line(summary({ status: 'discarded' }))).toEqual({
      text: 'Summary: discarded on the Summary tab',
      link: null,
    });
  });
});

describe('Причина раздела словами', () => {
  it('коды автозапуска — своей таблицей, без «вкладочного» абзаца у DOSSIER_TOO_LONG', () => {
    expect(summaryReasonText('AUTOSTART_NOTHING_TO_START')).toBe(
      'the autostart closed without starting the summary'
    );
    expect(summaryReasonText('DOSSIER_TOO_LONG')).toBe(
      'the dossier does not fit the model context'
    );
  });

  it('отказ старта: вкладка Summary, затем заготовки, затем запуск перевода; без точки, со строчной', () => {
    expect(summaryReasonText('SOURCE_HAS_NO_CHAPTERS')).toBe(
      'this version has no chapter text to write the summary from'
    );
    expect(summaryReasonText('DOSSIER_STALE')).toBe(
      'the book text changed after the dossier was built: rebuild the dossier'
    );
    expect(summaryReasonText('LLM_NO_PRICE')).toBe(
      'a model has no fixed price and its stage has no price cap (LLM settings)'
    );
    expect(summaryReasonText('LLM_STAGE_DISABLED')).toBe(
      'a stage of the translation is switched off on the LLM settings screen'
    );
  });

  it('у failed сначала срыв хода: тот же код подписан фразой хода, а не отказа старта', () => {
    expect(summaryReasonText('DRAFT_DOSSIER_MISSING', 'failed')).toBe('the dossier is gone');
    expect(summaryReasonText('DRAFT_DOSSIER_MISSING', 'skipped')).toBe(
      'the dossier of the translation run that made this version is gone'
    );
    expect(summaryReasonText('LLM_NO_PRICE', 'failed')).toBe(
      'a model has no fixed price and its stage has no price cap (LLM settings)'
    );
  });

  it('фраза в середину строки: снимается только конечная точка, аббревиатура не трогается', () => {
    expect(inlinePhrase('The dossier is gone.')).toBe('the dossier is gone');
    expect(inlinePhrase('Try later')).toBe('try later');
    expect(inlinePhrase('LLM settings are off.')).toBe('LLM settings are off');
  });

  it('незнакомый код — как есть, нет кода — «unknown reason»', () => {
    expect(summaryReasonText('SOMETHING_NEW')).toBe('SOMETHING_NEW');
    expect(summaryReasonText('SOMETHING_NEW', 'failed')).toBe('SOMETHING_NEW');
    expect(summaryReasonText(null)).toBe('unknown reason');
  });
});

describe('Траты Summary по языкам отчёта', () => {
  it('сумма без потери точности; ни у одного языка раздела нет — null', () => {
    expect(
      sumSummarySpent([
        { summary: { spentUsd: '0.10000000' } },
        { summary: null },
        { summary: { spentUsd: '0.25' } },
      ])
    ).toBe('0.35');
    expect(sumSummarySpent([{ summary: null }])).toBeNull();
  });
});
