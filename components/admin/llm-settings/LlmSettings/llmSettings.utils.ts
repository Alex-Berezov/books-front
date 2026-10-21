import { LLM_MODELS_UNAVAILABLE } from '@/api/endpoints/admin/llm';
import { ApiError } from '@/types/api';
import type { LlmModel, LlmStageSetting, UpdateLlmStageSettingRequest } from '@/types/api-schema';

/**
 * Сумма на вход ручек — та же строка, что ждёт сервер (`books/src/modules/llm/dto/llm-money.ts`):
 * до шести цифр целой части и до восьми после точки. В число она не переводится (В2).
 */
const MONEY_PATTERN = /^\d{1,6}(\.\d{1,8})?$/;

/** Границы полей этапа — копия проверок `books/src/modules/llm/dto/update-llm-stage-setting.dto.ts`. */
const MAX_FALLBACKS = 10;
const TEMPERATURE_MAX = 2;
const MAX_TOKENS_MAX = 200_000;

export const isValidMoney = (value: string): boolean => MONEY_PATTERN.test(value.trim());

/**
 * Потолок цены — сумма больше нуля: `0` сервер отвергает (`llm.service.ts`, `maxPrice.lte(0)`),
 * иначе резерв модели без цены был бы нулём. Сравнение без перевода в число: ненулевая цифра.
 */
export const isPositiveMoney = (value: string): boolean =>
  isValidMoney(value) && /[1-9]/.test(value);

/**
 * Одна и та же сумма разной записью (`100` и `100.00000000`) — без изменений. Сравнивается
 * строкой без хвостовых нулей, без перевода в число (В2).
 */
export const normalizeMoney = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed.includes('.')) return trimmed.replace(/^0+(?=\d)/, '');
  const [int, frac] = trimmed.split('.');
  const fraction = frac.replace(/0+$/, '');
  const integer = int.replace(/^0+(?=\d)/, '');
  return fraction ? `${integer}.${fraction}` : integer;
};

/**
 * Деньги показываются строкой без округления (В2), но без хвостовых нулей: `$100`, а не
 * `$100.00000000` — цены в длинном списке иначе не сравнить на глаз. Нет строки бюджета — прочерк.
 */
export const formatMoney = (value: string | null): string =>
  value === null ? '—' : `$${normalizeMoney(value)}`;

/** У модели нет фиксированной цены — без потолка цены этап не сохранится (Р24). */
export const hasNoFixedPrice = (model: LlmModel): boolean =>
  model.inputPerMTokUsd === null || model.outputPerMTokUsd === null;

const priceText = (model: LlmModel): string =>
  hasNoFixedPrice(model)
    ? 'no fixed price'
    : `in ${formatMoney(model.inputPerMTokUsd)} / out ${formatMoney(model.outputPerMTokUsd)} per 1M tokens`;

/** Подпись пункта выпадающего списка: цены видны до выбора, модели сравниваются в списке. */
export const modelOptionLabel = (model: LlmModel): string =>
  `${model.name} (${model.id}) · ${priceText(model)}`;

/**
 * Подпись цены под выбранной моделью. Каталог не загрузился — это не «модели нет в списке»:
 * список просто неизвестен, и подпись так и говорит.
 */
export const modelPriceLabel = (model: LlmModel | undefined, catalogKnown: boolean): string => {
  if (!catalogKnown) return 'price unknown: the model list is unavailable';
  if (!model) return 'not in the OpenRouter list';
  return priceText(model);
};

export const isModelsUnavailable = (error: unknown): boolean =>
  error instanceof ApiError && error.data?.code === LLM_MODELS_UNAVAILABLE;

/** Черновик формы этапа: числа и деньги — строками поля ввода, пустая строка — «умолчание». */
export interface StageDraft {
  model: string;
  fallbacks: string[];
  temperature: string;
  maxTokens: string;
  enabled: boolean;
  maxPricePerMTok: string;
}

export const toStageDraft = (setting: LlmStageSetting): StageDraft => ({
  model: setting.model,
  fallbacks: setting.fallbacks,
  temperature: setting.temperature === null ? '' : String(setting.temperature),
  maxTokens: String(setting.maxTokens),
  enabled: setting.enabled,
  maxPricePerMTok: setting.maxPricePerMTok ?? '',
});

/**
 * Ошибка черновика словами для админа или `null`. Ловит до запроса то, на что сервер ответит 400:
 * без этого админ видит голое «Bad Request» (Р24). Каталог не загрузился — проверки по каталогу
 * не делаются: сохранение и так ответит 503 своей плашкой. Каталог загрузился пустым — модели
 * в нём нет, и это ошибка ввода, а не «каталог неизвестен».
 */
export const validateStageDraft = (
  draft: StageDraft,
  models: LlmModel[],
  catalogKnown = models.length > 0
): string | null => {
  if (!draft.model) return 'Choose a model';
  if (draft.fallbacks.includes(draft.model)) return 'A fallback must differ from the main model';
  if (draft.fallbacks.length > MAX_FALLBACKS) return `At most ${MAX_FALLBACKS} fallback models`;

  const temperature = draft.temperature.trim();
  if (temperature !== '') {
    const value = Number(temperature);
    if (!Number.isFinite(value) || value < 0 || value > TEMPERATURE_MAX) {
      return `Temperature must be between 0 and ${TEMPERATURE_MAX}`;
    }
  }

  const maxTokens = draft.maxTokens.trim();
  if (maxTokens !== '' && !/^\d+$/.test(maxTokens)) return 'Max tokens must be a whole number';
  if (maxTokens !== '' && (Number(maxTokens) < 1 || Number(maxTokens) > MAX_TOKENS_MAX)) {
    return `Max tokens must be between 1 and ${MAX_TOKENS_MAX}`;
  }

  const cap = draft.maxPricePerMTok.trim();
  if (cap !== '' && !isPositiveMoney(cap)) {
    return 'Price cap must be a positive amount with up to 8 decimals';
  }

  if (!catalogKnown) return null;

  const byId = new Map(models.map((model) => [model.id, model]));
  const missing = [draft.model, ...draft.fallbacks].find((id) => !byId.has(id));
  if (missing) return `${missing} is not in the OpenRouter list: choose another model`;

  if (cap === '') {
    const unpriced = [draft.model, ...draft.fallbacks].find((id) => hasNoFixedPrice(byId.get(id)!));
    if (unpriced) return `${unpriced} has no fixed price: set the price cap per 1M tokens`;
  }

  return null;
};

/**
 * PUT заменяет строку этапа целиком: непереданное поле сбрасывается к умолчанию реестра.
 * Поэтому тело несёт все шесть полей, а пустое поле ввода — это явный `null`.
 *
 * Ответ GET отдаёт значения, уже слитые с умолчаниями реестра. Отправь их обратно как есть —
 * и первое же сохранение этапа (хоть ради одной модели) закрепит умолчания строкой, а их смена
 * в коде этот этап уже не заденет. Поэтому у этапа `source: 'default'` нетронутые
 * `temperature`/`maxTokens` уходят `null` («умолчание»), `maxPricePerMTok` — тоже, но только
 * если у основной и всех запасных есть цена: потолок сервер проверяет по телу, и `null`
 * у модели без цены дал бы 400. У `override` различить поле строки и умолчание нельзя —
 * поля уходят как пришли (решение арбитра `F05 | F05-1s`).
 */
export const toStageRequest = (
  draft: StageDraft,
  setting: LlmStageSetting,
  models: LlmModel[]
): UpdateLlmStageSettingRequest => {
  const loaded = toStageDraft(setting);
  const keepDefault = (field: 'temperature' | 'maxTokens' | 'maxPricePerMTok') =>
    setting.source === 'default' && draft[field].trim() === loaded[field].trim();

  const byId = new Map(models.map((model) => [model.id, model]));
  const allPriced =
    models.length > 0 &&
    [draft.model, ...draft.fallbacks].every((id) => {
      const model = byId.get(id);
      return model !== undefined && !hasNoFixedPrice(model);
    });

  const temperature = draft.temperature.trim();
  const maxTokens = draft.maxTokens.trim();
  const cap = draft.maxPricePerMTok.trim();

  return {
    model: draft.model,
    fallbacks: draft.fallbacks,
    temperature: keepDefault('temperature') || temperature === '' ? null : Number(temperature),
    maxTokens: keepDefault('maxTokens') || maxTokens === '' ? null : Number(maxTokens),
    enabled: draft.enabled,
    maxPricePerMTok: (keepDefault('maxPricePerMTok') && allPriced) || cap === '' ? null : cap,
  };
};
