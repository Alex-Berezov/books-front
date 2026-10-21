// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  formatMoney,
  isPositiveMoney,
  isValidMoney,
  modelPriceLabel,
  normalizeMoney,
  toStageDraft,
  toStageRequest,
  validateStageDraft,
  type StageDraft,
} from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import type { LlmModel, LlmStageSetting } from '@/types/api-schema';

/**
 * Проверки формы этапа F05-1s повторяют отказы сервера
 * (`books/src/modules/llm/dto/update-llm-stage-setting.dto.ts`, `llm.service.ts`): ловят до
 * запроса то, на что PUT ответит 400, и не блокируют то, что сервер примет.
 */

const priced = (id: string): LlmModel => ({
  id,
  name: id,
  contextLength: null,
  inputPerMTokUsd: '1.00000000',
  outputPerMTokUsd: '2.00000000',
  structuredOutputs: true,
});
const unpriced = (id: string): LlmModel => ({
  ...priced(id),
  inputPerMTokUsd: null,
  outputPerMTokUsd: null,
});

const MODELS = [priced('a'), priced('b'), unpriced('r')];

const draftOf = (overrides: Partial<StageDraft> = {}): StageDraft => ({
  model: 'a',
  fallbacks: [],
  temperature: '',
  maxTokens: '8000',
  enabled: true,
  maxPricePerMTok: '',
  ...overrides,
});

const SETTING: LlmStageSetting = {
  stage: 's',
  model: 'a',
  fallbacks: [],
  temperature: 0.3,
  maxTokens: 8000,
  enabled: true,
  maxPricePerMTok: '5.00000000',
  source: 'override',
  updatedAt: '2026-10-21T10:00:00.000Z',
};

describe('validateStageDraft', () => {
  it('пропускает допустимый черновик', () => {
    expect(validateStageDraft(draftOf(), MODELS)).toBeNull();
  });

  it.each<[string, Partial<StageDraft>, string]>([
    ['запасная совпала с основной', { fallbacks: ['a'] }, 'A fallback must differ'],
    [
      'запасных больше десяти',
      { fallbacks: Array.from({ length: 11 }, (_, i) => `f${i}`) },
      'At most 10 fallback models',
    ],
    ['температура выше 2', { temperature: '2.1' }, 'Temperature must be between 0 and 2'],
    ['температура отрицательная', { temperature: '-0.1' }, 'Temperature must be between 0 and 2'],
    ['температура не число', { temperature: 'hot' }, 'Temperature must be between 0 and 2'],
    ['maxTokens дробный', { maxTokens: '10.5' }, 'Max tokens must be a whole number'],
    ['maxTokens ноль', { maxTokens: '0' }, 'Max tokens must be between 1 and 200000'],
    ['maxTokens выше 200000', { maxTokens: '200001' }, 'Max tokens must be between 1 and 200000'],
    ['потолок цены 0', { maxPricePerMTok: '0' }, 'Price cap must be a positive amount'],
    ['потолок цены не сумма', { maxPricePerMTok: '1e3' }, 'Price cap must be a positive amount'],
    ['модели нет в каталоге', { model: 'gone' }, 'gone is not in the OpenRouter list'],
    ['запасная без цены без потолка', { fallbacks: ['r'] }, 'r has no fixed price'],
  ])('%s — отказ', (_, overrides, message) => {
    expect(validateStageDraft(draftOf(overrides), MODELS)).toContain(message);
  });

  it.each<[string, Partial<StageDraft>]>([
    ['температура 0 и 2 на границах', { temperature: '2' }],
    ['maxTokens 1 и 200000 на границах', { maxTokens: '200000' }],
    ['модель без цены с потолком', { model: 'r', maxPricePerMTok: '0.00000001' }],
  ])('%s — пропуск', (_, overrides) => {
    expect(validateStageDraft(draftOf(overrides), MODELS)).toBeNull();
  });

  it('каталог не загрузился — проверки по каталогу не делаются', () => {
    expect(validateStageDraft(draftOf({ model: 'r' }), [])).toBeNull();
  });
});

describe('toStageRequest', () => {
  it('этап override: поля уходят как пришли', () => {
    expect(toStageRequest(toStageDraft(SETTING), SETTING, MODELS)).toEqual({
      model: 'a',
      fallbacks: [],
      temperature: 0.3,
      maxTokens: 8000,
      enabled: true,
      maxPricePerMTok: '5.00000000',
    });
  });

  it('этап default: нетронутые поля уходят null, правленые — значением', () => {
    const setting = { ...SETTING, source: 'default' as const };
    const draft = { ...toStageDraft(setting), temperature: '0.7' };

    expect(toStageRequest(draft, setting, MODELS)).toMatchObject({
      temperature: 0.7,
      maxTokens: null,
      maxPricePerMTok: null,
    });
  });

  it('этап default с моделью без цены: нетронутый потолок цены уходит значением', () => {
    const setting = { ...SETTING, source: 'default' as const, fallbacks: ['r'] };

    expect(toStageRequest(toStageDraft(setting), setting, MODELS).maxPricePerMTok).toBe(
      '5.00000000'
    );
  });

  it('этап default без каталога: потолок цены уходит значением — цен не знаем', () => {
    const setting = { ...SETTING, source: 'default' as const };

    expect(toStageRequest(toStageDraft(setting), setting, []).maxPricePerMTok).toBe('5.00000000');
  });
});

describe('деньги строкой (В2)', () => {
  it.each([
    ['100', '100.00000000'],
    ['0', '0.00000000'],
    ['007.50', '7.5'],
  ])('%s и %s — одна сумма', (left, right) => {
    expect(normalizeMoney(left)).toBe(normalizeMoney(right));
  });

  it('показ без хвостовых нулей и без округления', () => {
    expect(formatMoney('100.00000000')).toBe('$100');
    expect(formatMoney('1.23456789')).toBe('$1.23456789');
    expect(formatMoney('0.50000000')).toBe('$0.5');
    expect(formatMoney(null)).toBe('—');
  });

  it('разные суммы различаются', () => {
    expect(normalizeMoney('10.00000001')).not.toBe(normalizeMoney('10'));
  });

  it('сумма — до шести цифр и восьми знаков, пустое и минус — нет', () => {
    expect(isValidMoney('123456.12345678')).toBe(true);
    expect(isValidMoney('1234567')).toBe(false);
    expect(isValidMoney('1.123456789')).toBe(false);
    expect(isValidMoney('')).toBe(false);
    expect(isValidMoney('-1')).toBe(false);
    expect(isPositiveMoney('0.00000000')).toBe(false);
    expect(isPositiveMoney('0.00000001')).toBe(true);
  });
});

describe('modelPriceLabel', () => {
  it('каталог не загрузился — «цена неизвестна», а не «нет в списке»', () => {
    expect(modelPriceLabel(undefined, false)).toBe('price unknown: the model list is unavailable');
    expect(modelPriceLabel(undefined, true)).toBe('not in the OpenRouter list');
  });
});
