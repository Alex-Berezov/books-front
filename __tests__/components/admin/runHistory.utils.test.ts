import { describe, expect, it } from 'vitest';
import {
  authorText,
  languageResultText,
  stageModelText,
} from '@/components/admin/translation-run/RunHistory/runHistory.utils';

/** F05-8: подписи строки истории запусков — автор, модели этапа, итог языка. */

describe('runHistory.utils', () => {
  it('автор: имя с почтой, без имени — почта, удалён — deleted user', () => {
    expect(authorText({ id: 'u1', email: 'a@x.com', name: 'Ann' })).toBe('Ann (a@x.com)');
    expect(authorText({ id: 'u1', email: 'a@x.com', name: null })).toBe('a@x.com');
    expect(authorText(null)).toBe('deleted user');
  });

  it('модель этапа: подпись этапа, без запасных — без хвоста; неизвестный этап — кодом', () => {
    expect(stageModelText({ stage: 'translate', model: 'a/main', fallbacks: [] })).toBe(
      'Translation: a/main'
    );
    expect(stageModelText({ stage: 'dossier', model: 'd/m', fallbacks: ['x/1', 'x/2'] })).toBe(
      'Dossier: d/m (fallbacks: x/1, x/2)'
    );
    expect(stageModelText({ stage: 'new_stage', model: 'n/m', fallbacks: [] })).toBe(
      'new_stage: n/m'
    );
  });

  it('итог языка: упавший без причины, остановка словами, неизвестный код — как есть', () => {
    const base = { language: 'es' as const, reasonText: null, draftVersionId: null };
    expect(languageResultText({ ...base, status: 'failed', reason: null })).toBe('ES: Failed.');
    expect(
      languageResultText({ ...base, status: 'pending', reason: 'LLM_BUDGET_EXCEEDED:ceiling' })
    ).toBe('ES: waiting, the spending ceiling is reached');
    expect(languageResultText({ ...base, status: 'cancelled', reason: 'LLM_PROVIDER_ERROR' })).toBe(
      'ES: cancelled, stopped: the model provider refused the request'
    );
    expect(languageResultText({ ...base, status: 'running', reason: 'SOMETHING_NEW' })).toBe(
      'ES: in progress, SOMETHING_NEW'
    );
    expect(languageResultText({ ...base, status: 'done', reason: null })).toBe('ES: done');
  });
});
