import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LlmSettings } from '@/components/admin/llm-settings/LlmSettings/LlmSettings';
import { ApiError } from '@/types/api';
import type { LlmModel, LlmStageSetting, LlmStatus } from '@/types/api-schema';

/**
 * Экран «LLM settings» (F05-1s). Ручки настоящие, подменён только HTTP-клиент: проверяется,
 * что уходит на сервер, а не что вызван хук.
 */

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  snackbar: vi.fn(),
}));

vi.mock('@/lib/http-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/http-client')>()),
  httpGetAuth: mocks.get,
  httpPutAuth: mocks.put,
}));

vi.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: mocks.snackbar }),
}));

// Копия, а не тот же массив: тест с «сервером с состоянием» меняет свой массив на месте,
// и общий с кэшем массив спрятал бы новый ответ от сравнения react-query.
const page = <T,>(items: T[]) => ({
  items: [...items],
  pagination: { page: 1, limit: items.length, total: items.length, totalPages: 1 },
});

const statusOf = (overrides: Partial<LlmStatus> = {}): LlmStatus => ({
  state: 'ENABLED',
  keyConfigured: true,
  budgetConfigured: true,
  ceilingUsd: '100.00000000',
  spentUsd: '1.23456789',
  reservedUsd: '0.00000000',
  defaultRunLimitUsd: '10.00000000',
  ...overrides,
});

const MODELS: LlmModel[] = [
  {
    id: 'vendor/model-a',
    name: 'Model A',
    contextLength: 200000,
    inputPerMTokUsd: '3.00000000',
    outputPerMTokUsd: '15.00000000',
    structuredOutputs: true,
  },
  {
    id: 'vendor/model-b',
    name: 'Model B',
    contextLength: 128000,
    inputPerMTokUsd: '0.50000000',
    outputPerMTokUsd: '1.50000000',
    structuredOutputs: true,
  },
  {
    id: 'vendor/router',
    name: 'Router',
    contextLength: null,
    inputPerMTokUsd: null,
    outputPerMTokUsd: null,
    structuredOutputs: false,
  },
];

const STAGE: LlmStageSetting = {
  stage: 'translate',
  model: 'vendor/model-a',
  fallbacks: ['vendor/model-b'],
  temperature: 0.3,
  maxTokens: 8000,
  enabled: true,
  maxPricePerMTok: '20.00000000',
  source: 'override',
  updatedAt: '2026-10-21T10:00:00.000Z',
};

const serve = ({
  status = statusOf(),
  stages = [STAGE],
  models = MODELS as LlmModel[] | Error,
}: { status?: LlmStatus; stages?: LlmStageSetting[]; models?: LlmModel[] | Error } = {}) => {
  mocks.get.mockImplementation(async (path: string) => {
    if (path === '/admin/llm/status') return status;
    if (path === '/admin/llm/stage-settings') return page(stages);
    if (path === '/admin/llm/models') {
      if (models instanceof Error) throw models;
      return page(models);
    }
    throw new Error(`unexpected GET ${path}`);
  });
};

let client: QueryClient;

const renderScreen = (queries: Record<string, unknown> = { retry: false }) => {
  client = new QueryClient({ defaultOptions: { queries } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<LlmSettings />, { wrapper: Wrapper });
};

/** Код, который общий тост 5xx пропускает: экран показывает его своей плашкой. */
const LOCAL = { localErrorCodes: ['LLM_MODELS_UNAVAILABLE'] };

const stageCard = () => screen.findByRole('article', { name: 'Stage translate' });

/** Пункт списка подписан «имя (id) · цена»: ищем по началу подписи. */
const chooseModel = async (card: HTMLElement, name: string, id: string) => {
  const input = card.querySelector('#llm-stage-translate-model') as HTMLInputElement;
  fireEvent.mouseDown(input);
  const option = await screen.findByTitle((title) => title.startsWith(`${name} (${id}) · `));
  fireEvent.click(option);
};

describe('LlmSettings (F05-1s)', () => {
  beforeEach(() => {
    // reset, а не clear: ответ PUT из прошлого теста не должен дожить до следующего.
    vi.resetAllMocks();
  });

  it('сохранение этапа шлёт PUT с выбранной моделью и всеми полями этапа', async () => {
    serve({ stages: [{ ...STAGE, fallbacks: ['vendor/router'] }] });
    mocks.put.mockResolvedValue({ ...STAGE, model: 'vendor/model-b' });
    renderScreen();

    const card = await stageCard();
    await chooseModel(card, 'Model B', 'vendor/model-b');
    fireEvent.click(within(card).getByText('Save stage'));

    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    expect(mocks.put).toHaveBeenCalledWith('/admin/llm/stage-settings/translate', {
      model: 'vendor/model-b',
      fallbacks: ['vendor/router'],
      temperature: 0.3,
      maxTokens: 8000,
      enabled: true,
      maxPricePerMTok: '20.00000000',
    });
  });

  it('пустые поля уходят явным null, а не пропадают из тела', async () => {
    serve({ stages: [{ ...STAGE, fallbacks: [], temperature: null, maxPricePerMTok: null }] });
    mocks.put.mockResolvedValue(STAGE);
    renderScreen();

    const card = await stageCard();
    fireEvent.click(within(card).getByRole('switch'));
    fireEvent.click(within(card).getByText('Save stage'));

    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    const body = mocks.put.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(
      ['enabled', 'fallbacks', 'maxPricePerMTok', 'maxTokens', 'model', 'temperature'].sort()
    );
    expect(body.temperature).toBeNull();
    expect(body.maxPricePerMTok).toBeNull();
  });

  it('модель без цены без потолка цены не уходит на сервер, админ видит причину (Р24)', async () => {
    serve({ stages: [{ ...STAGE, fallbacks: [], maxPricePerMTok: null }] });
    renderScreen();

    const card = await stageCard();
    await chooseModel(card, 'Router', 'vendor/router');
    fireEvent.click(within(card).getByText('Save stage'));

    expect(await within(card).findByRole('alert')).toHaveTextContent(
      'vendor/router has no fixed price: set the price cap per 1M tokens'
    );
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it('без ключа — плашка, а потолок по-прежнему правится', async () => {
    serve({ status: statusOf({ state: 'DISABLED', keyConfigured: false }) });
    mocks.put.mockResolvedValue({});
    renderScreen();

    expect(await screen.findByText('OpenRouter key is not configured')).toBeInTheDocument();
    expect(screen.getByText('Not configured')).toBeInTheDocument();

    const ceiling = screen.getByLabelText('Ceiling, USD (0 stops every call)');
    fireEvent.change(ceiling, { target: { value: '0' } });
    fireEvent.click(screen.getByText('Save budget'));

    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    // Уходит только изменённая сумма: лимит из открытого экрана не затирает чужую правку.
    expect(mocks.put).toHaveBeenCalledWith('/admin/llm/budget', { ceilingUsd: '0' });
  });

  it('стёртый потолок — ошибка ввода, запрос не уходит', async () => {
    serve();
    renderScreen();

    const ceiling = await screen.findByLabelText('Ceiling, USD (0 stops every call)');
    fireEvent.change(ceiling, { target: { value: '' } });

    expect(screen.getByText(/An amount is required/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save budget' })).toBeDisabled();
  });

  it('та же сумма другой записью — без изменений, сохранять нечего', async () => {
    serve();
    renderScreen();

    const ceiling = await screen.findByLabelText('Ceiling, USD (0 stops every call)');
    fireEvent.change(ceiling, { target: { value: '100' } });

    expect(screen.getByRole('button', { name: 'Save budget' })).toBeDisabled();
  });

  it('с ключом плашки нет, деньги показаны строкой как пришли', async () => {
    serve();
    renderScreen();

    expect(await screen.findByText('$1.23456789')).toBeInTheDocument();
    expect(screen.queryByText('OpenRouter key is not configured')).not.toBeInTheDocument();
  });

  it('каталог недоступен (503 LLM_MODELS_UNAVAILABLE) — своя плашка, этапы видны', async () => {
    serve({
      models: new ApiError({
        statusCode: 503,
        message: 'OpenRouter model list is unavailable',
        data: { code: 'LLM_MODELS_UNAVAILABLE' },
      }),
    });
    renderScreen();

    expect(await screen.findByText('OpenRouter model list is unavailable')).toBeInTheDocument();
    expect(await stageCard()).toBeInTheDocument();
    expect(client.getQueryCache().find({ queryKey: ['llm', 'models'] })?.meta).toEqual(LOCAL);
  });

  it('этап на умолчаниях кода: нетронутые поля уходят null, правленое — значением', async () => {
    serve({ stages: [{ ...STAGE, source: 'default', updatedAt: null }] });
    mocks.put.mockResolvedValue(STAGE);
    renderScreen();

    const card = await stageCard();
    fireEvent.change(within(card).getByLabelText(/^Max tokens/), { target: { value: '4000' } });
    fireEvent.click(within(card).getByText('Save stage'));

    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    expect(mocks.put).toHaveBeenCalledWith('/admin/llm/stage-settings/translate', {
      model: 'vendor/model-a',
      fallbacks: ['vendor/model-b'],
      temperature: null,
      maxTokens: 4000,
      enabled: true,
      maxPricePerMTok: null,
    });
  });

  it('этап на умолчаниях с моделью без цены: потолок цены уходит значением, иначе 400', async () => {
    serve({
      stages: [{ ...STAGE, source: 'default', updatedAt: null, fallbacks: ['vendor/router'] }],
    });
    mocks.put.mockResolvedValue(STAGE);
    renderScreen();

    const card = await stageCard();
    fireEvent.click(within(card).getByRole('switch'));
    fireEvent.click(within(card).getByText('Save stage'));

    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    const body = mocks.put.mock.calls[0][1] as Record<string, unknown>;
    expect(body.maxPricePerMTok).toBe('20.00000000');
    expect(body.temperature).toBeNull();
  });

  it('503 каталога на сохранении этапа — причина в карточке; правка ввода её снимает', async () => {
    serve();
    mocks.put.mockRejectedValue(
      new ApiError({
        statusCode: 503,
        message: 'OpenRouter model list is unavailable',
        data: { code: 'LLM_MODELS_UNAVAILABLE' },
      })
    );
    renderScreen();

    const card = await stageCard();
    fireEvent.click(within(card).getByRole('switch'));
    fireEvent.click(within(card).getByText('Save stage'));

    expect(await within(card).findByRole('alert')).toHaveTextContent(
      'OpenRouter model list is unavailable, the stage was not saved'
    );
    expect(client.getMutationCache().getAll()[0]?.meta).toEqual(LOCAL);

    fireEvent.change(within(card).getByLabelText(/^Temperature/), { target: { value: '0.5' } });
    expect(within(card).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('фоновый перезапрос того же ответа не затирает правку черновика', async () => {
    serve();
    renderScreen();

    const card = await stageCard();
    const temperature = within(card).getByLabelText(/^Temperature/);
    fireEvent.change(temperature, { target: { value: '1.1' } });

    await client.refetchQueries({ queryKey: ['llm', 'stage-settings'] });
    await waitFor(() =>
      expect(
        mocks.get.mock.calls.filter(([path]) => path === '/admin/llm/stage-settings')
      ).toHaveLength(2)
    );

    expect(within(await stageCard()).getByLabelText(/^Temperature/)).toHaveValue('1.1');
  });

  it('после сохранения бюджета экран перечитывает состояние модуля', async () => {
    serve();
    mocks.put.mockResolvedValue({});
    renderScreen();

    const runLimit = await screen.findByLabelText(/^Default run limit/);
    fireEvent.change(runLimit, { target: { value: '25' } });
    fireEvent.click(screen.getByText('Save budget'));

    await waitFor(() =>
      expect(mocks.get.mock.calls.filter(([path]) => path === '/admin/llm/status')).toHaveLength(2)
    );
    expect(mocks.snackbar).toHaveBeenCalledWith('Budget saved', { variant: 'success' });
  });

  it('отказ 400 бюджета — причина снекбаром; 5xx — молча, его показывает общий тост', async () => {
    serve();
    mocks.put.mockRejectedValueOnce(new ApiError({ statusCode: 400, message: 'bad amount' }));
    mocks.put.mockRejectedValueOnce(new ApiError({ statusCode: 500, message: 'boom' }));
    renderScreen();

    const runLimit = await screen.findByLabelText(/^Default run limit/);
    fireEvent.change(runLimit, { target: { value: '25' } });
    fireEvent.click(screen.getByText('Save budget'));
    await waitFor(() =>
      expect(mocks.snackbar).toHaveBeenCalledWith('bad amount', { variant: 'error' })
    );

    fireEvent.click(screen.getByText('Save budget'));
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(2));
    expect(mocks.snackbar).toHaveBeenCalledTimes(1);
  });

  it('лимит запуска не сумма — ошибка ввода, запрос не уходит', async () => {
    serve();
    renderScreen();

    const runLimit = await screen.findByLabelText(/^Default run limit/);
    fireEvent.change(runLimit, { target: { value: '-5' } });

    expect(screen.getByText(/An amount is required/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save budget' })).toBeDisabled();
  });

  it('строки бюджета нет — плашка, формы нет', async () => {
    serve({
      status: statusOf({
        budgetConfigured: false,
        ceilingUsd: null,
        spentUsd: null,
        reservedUsd: null,
        defaultRunLimitUsd: null,
      }),
    });
    renderScreen();

    expect(await screen.findByText('Spending ceiling row is missing')).toBeInTheDocument();
    expect(screen.queryByText('Save budget')).not.toBeInTheDocument();
  });

  it('без правки сохранять нечего: кнопка этапа неактивна', async () => {
    serve({ stages: [{ ...STAGE, source: 'default', updatedAt: null }] });
    renderScreen();

    const card = await stageCard();
    expect(within(card).getByRole('button', { name: 'Save stage' })).toBeDisabled();
  });

  it('503 каталога не повторяется даже при общей стратегии повторов', async () => {
    serve({
      models: new ApiError({
        statusCode: 503,
        message: 'OpenRouter model list is unavailable',
        data: { code: 'LLM_MODELS_UNAVAILABLE' },
      }),
    });
    renderScreen({ retry: 3, retryDelay: 0 });

    expect(await screen.findByText('OpenRouter model list is unavailable')).toBeInTheDocument();
    expect(mocks.get.mock.calls.filter(([path]) => path === '/admin/llm/models')).toHaveLength(1);
  });

  it('удачное сохранение этапа: снекбар и карточка сразу на сохранённой строке', async () => {
    // Сервер с состоянием: после PUT список отдаёт сохранённую строку, как настоящий.
    const stages: LlmStageSetting[] = [{ ...STAGE, source: 'default', updatedAt: null }];
    const saved: LlmStageSetting = {
      ...STAGE,
      maxTokens: 4000,
      source: 'override',
      updatedAt: '2026-10-21T12:00:00.000Z',
    };
    serve({ stages });
    mocks.put.mockImplementation(async () => {
      stages[0] = saved;
      return saved;
    });
    renderScreen();

    const card = await stageCard();
    expect(within(card).getByText('Stage default')).toBeInTheDocument();
    fireEvent.change(within(card).getByLabelText(/^Max tokens/), { target: { value: '4000' } });
    fireEvent.click(within(card).getByText('Save stage'));

    await waitFor(() =>
      expect(mocks.snackbar).toHaveBeenCalledWith('Stage translate saved', { variant: 'success' })
    );
    // Карточка перестраивается по новому `updatedAt`: ищем заново, а не в старом узле.
    expect(await screen.findByText('Saved in admin')).toBeInTheDocument();
    const savedCard = screen.getByRole('article', { name: 'Stage translate' });
    expect(within(savedCard).getByRole('button', { name: 'Save stage' })).toBeDisabled();
  });

  it('упавший фоновый перезапрос этапов не убирает карточки с правкой', async () => {
    serve();
    renderScreen();

    const card = await stageCard();
    fireEvent.change(within(card).getByLabelText(/^Temperature/), { target: { value: '1.1' } });

    mocks.get.mockImplementation(async (path: string) => {
      if (path === '/admin/llm/stage-settings')
        throw new ApiError({ statusCode: 500, message: 'x' });
      if (path === '/admin/llm/status') return statusOf();
      return page(MODELS);
    });
    await client.refetchQueries({ queryKey: ['llm', 'stage-settings'] });
    await waitFor(() =>
      expect(client.getQueryState(['llm', 'stage-settings'])?.status).toBe('error')
    );
    // Дать экрану перерисоваться от ошибки: проверка ниже иначе прошла бы до неё.
    await screen.findByRole('article', { name: 'Stage translate' });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.queryByText('Could not load the stages')).not.toBeInTheDocument();
    expect(within(await stageCard()).getByLabelText(/^Temperature/)).toHaveValue('1.1');
  });

  it('каталог пришёл пустым — модели нет в списке, это ошибка ввода', async () => {
    serve({ models: [] });
    renderScreen();

    const card = await stageCard();
    fireEvent.click(within(card).getByRole('switch'));

    expect(within(card).getByRole('alert')).toHaveTextContent(
      'vendor/model-a is not in the OpenRouter list'
    );
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it('пустой реестр этапов — пустое состояние с пояснением', async () => {
    serve({ stages: [] });
    renderScreen();

    expect(await screen.findByText(/No pipeline stages are registered yet/)).toBeInTheDocument();
  });
});
