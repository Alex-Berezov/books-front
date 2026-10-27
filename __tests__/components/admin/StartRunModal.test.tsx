import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StartRunModal } from '@/components/admin/translation-run/StartRunModal';
import { ApiError } from '@/types/api';
import type {
  LlmStageSetting,
  TranslationRunEstimate,
  TranslationRunEstimateParams,
  TranslationSource,
} from '@/types/api-schema';

/**
 * F05-7: окно запуска перевода. Хуки подменены: проверяется, какие языки можно выбрать (§2.2,
 * §7 п.10), что оценка перезапрашивается на смену выбора и что уходит в старт.
 */

interface EstimateState {
  data: TranslationRunEstimate | undefined;
  isSuccess: boolean;
  isError: boolean;
  isFetching: boolean;
  error: unknown;
}

const hooks = vi.hoisted(() => ({
  estimateParams: [] as Array<TranslationRunEstimateParams | null>,
  estimate: {} as EstimateState,
  start: { isError: false, error: null as unknown },
  settingsError: false,
  mutate: vi.fn(),
}));

const stage = (name: string, model: string): LlmStageSetting => ({
  stage: name,
  model,
  fallbacks: [],
  temperature: null,
  maxTokens: 1000,
  enabled: true,
  maxPricePerMTok: null,
  source: 'default',
  updatedAt: null,
});

vi.mock('@/api/hooks', () => ({
  RUN_MAX_LANGUAGES: 5,
  useLlmModels: () => ({ data: { items: [] } }),
  useLlmStageSettings: () =>
    hooks.settingsError
      ? { data: undefined, isError: true, error: new Error('x') }
      : {
          data: {
            items: [
              stage('translate', 'base/translate'),
              stage('check_semantic', 'other/check'),
              stage('dossier', 'dossier/model'),
            ],
          },
          isError: false,
        },
  useTranslationRunEstimate: (_: string, params: TranslationRunEstimateParams | null) => {
    hooks.estimateParams.push(params);
    return hooks.estimate;
  },
  useStartTranslationRun: () => ({ mutate: hooks.mutate, isPending: false, ...hooks.start }),
}));

const source: TranslationSource = {
  canTranslate: true,
  reason: null,
  sourceVersionId: 'v1',
  sourceLanguage: 'en',
  originalLanguageRaw: 'English',
  originalLanguageMismatch: false,
  targets: [
    { language: 'en', available: false, reason: 'IS_SOURCE' },
    { language: 'es', available: true, reason: null },
    { language: 'fr', available: false, reason: 'VERSION_EXISTS' },
    { language: 'pt', available: false, reason: 'NOT_IN_INTAKE' },
    { language: 'ru', available: false, reason: 'TRANSLATION_IN_PROGRESS' },
  ],
};

const renderModal = (over: Partial<TranslationSource> = {}) =>
  render(
    <StartRunModal
      isOpen
      onCancel={vi.fn()}
      onStarted={vi.fn()}
      versionId="v1"
      bookId="b1"
      source={{ ...source, ...over }}
    />
  );

const estimateData: TranslationRunEstimate = {
  translateModel: 'base/translate',
  chapters: 2,
  chunks: 3,
  dossier: { estimateUsd: '0.5', suggestedLimitUsd: '0.75', upperBound: true },
  languages: [
    {
      language: 'es',
      glossary: { estimateUsd: '0.2', suggestedLimitUsd: '0.3', upperBound: true },
      splitUsd: '0',
      translateUsd: '1',
      checkUsd: '0.2',
      finalCheckUsd: '0.1',
      metadataUsd: '0.01',
      totalUsd: '1.31',
    },
  ],
  upperBound: true,
  translationsUsd: '1.31',
  totalUsd: '1.81',
  minLimitUsd: '0.75',
  defaultLimitUsd: '20',
  nearLimitChapters: [],
};

describe('Окно запуска перевода (F05-7)', () => {
  beforeEach(() => {
    hooks.estimateParams.length = 0;
    hooks.mutate.mockClear();
    hooks.estimate = {
      data: undefined,
      isSuccess: false,
      isError: false,
      isFetching: false,
      error: null,
    };
    hooks.start = { isError: false, error: null };
    hooks.settingsError = false;
  });

  const ready = (over: Partial<EstimateState> = {}) => {
    hooks.estimate = {
      data: estimateData,
      isSuccess: true,
      isError: false,
      isFetching: false,
      error: null,
      ...over,
    };
  };

  it('язык исходника не предлагается; языки с версией, вне анкеты и с идущим переводом недоступны, каждый со своей подписью', () => {
    renderModal();

    expect(screen.queryByRole('checkbox', { name: 'EN' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'ES' })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: 'FR' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'PT' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'RU' })).toBeDisabled();
    expect(screen.getByText('a version already exists')).toBeInTheDocument();
    expect(screen.getByText('not in the rights intake of the book')).toBeInTheDocument();
    expect(screen.getByText('a translation into it is in progress')).toBeInTheDocument();
  });

  it('оценка перезапрашивается на смену выбора языков', () => {
    renderModal({
      targets: [
        { language: 'es', available: true, reason: null },
        { language: 'fr', available: true, reason: null },
      ],
    });

    fireEvent.click(screen.getByRole('checkbox', { name: 'ES' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'FR' }));

    expect(hooks.estimateParams[0]).toBeNull();
    expect(hooks.estimateParams).toContainEqual({ languages: ['es'] });
    expect(hooks.estimateParams.at(-1)).toEqual({ languages: ['es', 'fr'] });
  });

  it('модели этапов видны из настроек; оценка — досье, язык и итог строками, подпись про повторы', () => {
    ready();
    renderModal();

    expect(screen.getByText('Meaning check: other/check')).toBeInTheDocument();
    expect(screen.getByText('Dossier: dossier/model')).toBeInTheDocument();
    expect(screen.getByText('Dossier (own limit $0.75)')).toBeInTheDocument();
    expect(screen.getByText('Glossary ES (own limit $0.3)')).toBeInTheDocument();
    expect(screen.getByText('Translation ES')).toBeInTheDocument();
    expect(screen.getByText('$1.31')).toBeInTheDocument();
    expect(screen.getByText('$1.81')).toBeInTheDocument();
    // Jev входит в оценку проверок с F05-R (решение арбитра `F05 | F05-R`, Р9).
    expect(
      screen.getByText('The estimate does not include retries of pieces after a failed check.')
    ).toBeInTheDocument();
  });

  it('Start без лимита — умолчание сервера: лимит в тело не уходит, лимит по умолчанию виден', () => {
    ready();
    renderModal();

    expect(screen.getByLabelText('Run limit, $')).toHaveAttribute('placeholder', '$20');
    fireEvent.click(screen.getByRole('checkbox', { name: 'ES' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    expect(hooks.mutate).toHaveBeenCalledWith({ languages: ['es'] });
  });

  it('отмеченный язык стал недоступен (перечитаны языки) — его можно снять', () => {
    const { rerender } = render(
      <StartRunModal
        isOpen
        onCancel={vi.fn()}
        onStarted={vi.fn()}
        versionId="v1"
        bookId="b1"
        source={source}
      />
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'ES' }));
    rerender(
      <StartRunModal
        isOpen
        onCancel={vi.fn()}
        onStarted={vi.fn()}
        versionId="v1"
        bookId="b1"
        source={{
          ...source,
          targets: [{ language: 'es', available: false, reason: 'TRANSLATION_IN_PROGRESS' }],
        }}
      />
    );

    expect(screen.getByRole('checkbox', { name: 'ES' })).toBeEnabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'ES' }));
    expect(screen.getByRole('checkbox', { name: 'ES' })).toBeDisabled();
  });

  it('без выбранных языков запустить нельзя', () => {
    ready();
    renderModal();

    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
  });

  it('лимит и модель перевода уходят в старт; неверный лимит запуск блокирует', () => {
    ready();
    renderModal();
    fireEvent.click(screen.getByRole('checkbox', { name: 'ES' }));

    fireEvent.change(screen.getByLabelText('Run limit, $'), { target: { value: '1,5' } });
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Run limit, $'), { target: { value: '7.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    expect(hooks.mutate).toHaveBeenCalledWith({ languages: ['es'], limitUsd: '7.5' });
  });

  it('оценка перечитывается в фоне — Start ждёт новую', () => {
    ready({ isFetching: true });
    renderModal();
    fireEvent.click(screen.getByRole('checkbox', { name: 'ES' }));

    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
  });

  it('отказ старта по языку и отказ оценки — своими подписями', () => {
    const conflict = new ApiError({
      message: 'Conflict',
      statusCode: 409,
      error: 'Conflict',
      data: {
        code: 'TRANSLATION_TARGET_UNAVAILABLE',
        languages: [{ language: 'es', reason: 'VERSION_EXISTS' }],
      },
    });
    hooks.start = { isError: true, error: conflict };
    hooks.estimate = {
      data: undefined,
      isSuccess: false,
      isError: true,
      isFetching: false,
      error: new ApiError({
        message: 'Conflict',
        statusCode: 409,
        error: 'Conflict',
        data: { code: 'SOURCE_TOO_MANY_CHAPTERS' },
      }),
    };
    renderModal();

    expect(screen.getByText(/ES: a version already exists/)).toBeInTheDocument();
    expect(
      screen.getByText(
        'The source has more than 2000 chapters: a translation run takes at most 2000.'
      )
    ).toBeInTheDocument();
  });

  it('настройки этапов не загрузились — плашка, а не вечная загрузка', () => {
    hooks.settingsError = true;
    renderModal();

    expect(screen.getAllByRole('alert').length).toBe(1);
  });
});
