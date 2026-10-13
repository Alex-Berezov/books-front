import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { CONSENT_REGION_STORAGE_KEY, CONSENT_STORAGE_KEY } from '@/lib/consent/consent-storage';
import { CONSENT_POLICY_VERSION } from '@/lib/consent/consent-version';
import { ConsentProvider, useConsent } from '@/lib/consent/ConsentProvider';

const nav = { pathname: '/en' };
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));
vi.mock('next/script', () => ({
  default: ({ src, id }: { src?: string; id?: string }) => (
    <span data-testid="ga-script" data-src={src ?? id} />
  ),
}));

const GA_ID = 'G-TEST';
const DAY = 24 * 60 * 60 * 1000;
const EXPIRED = 'Thu, 01 Jan 1970 00:00:00 GMT';

/** Состояние провайдера строкой: ждём его, а не таймер, - так решение видно детерминированно. */
function Probe() {
  const { region, choice, gpc, analyticsAllowed } = useConsent();
  const decided = choice === null ? 'none' : String(choice.analytics);
  return (
    <span data-testid="probe">{`region=${region} choice=${decided} gpc=${gpc} ga=${analyticsAllowed}`}</span>
  );
}

const mount = (measurementId: string = GA_ID) =>
  render(
    <ConsentProvider>
      <GoogleAnalytics measurementId={measurementId} />
      <Probe />
    </ConsentProvider>
  );

const probeShows = (text: string) =>
  waitFor(() => expect(screen.getByTestId('probe').textContent).toContain(text));

const answer = (consentRequired: unknown, ok = true) =>
  vi.fn().mockResolvedValue({ ok, json: async () => ({ consentRequired }) });

const setChoice = (analytics: boolean, ageDays = 1, version = CONSENT_POLICY_VERSION) =>
  window.localStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({
      analytics,
      decidedAt: new Date(Date.now() - ageDays * DAY).toISOString(),
      version,
    })
  );

const setGpc = (value: boolean) =>
  Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value });

const gaScripts = () => screen.queryAllByTestId('ga-script');

const clearAllCookies = () => {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0].trim();
    if (name) document.cookie = `${name}=; expires=${EXPIRED}; path=/`;
  }
};

describe('ConsentProvider + GoogleAnalytics', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  const stubFetch = (mock: ReturnType<typeof vi.fn>) => {
    fetchMock = mock;
    vi.stubGlobal('fetch', mock);
  };

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    nav.pathname = '/en';
    stubFetch(answer(true));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, 'globalPrivacyControl');
    clearAllCookies();
  });

  it('страна плашки: после ответа сервера GA нет, регион запомнен на вкладку', async () => {
    mount();
    await probeShows('region=required');
    expect(gaScripts()).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(CONSENT_REGION_STORAGE_KEY)).toBe('required');
  });

  it('остальные страны: GA есть', async () => {
    stubFetch(answer(false));
    mount();
    await probeShows('region=not-required');
    expect(gaScripts()).toHaveLength(2);
    expect(window.sessionStorage.getItem(CONSENT_REGION_STORAGE_KEY)).toBe('not-required');
  });

  it('GPC: GA нет даже при сохранённом «Принять» и в стране без плашки, запроса нет', async () => {
    setGpc(true);
    setChoice(true);
    stubFetch(answer(false));
    mount();
    await probeShows('gpc=true');
    expect(screen.getByTestId('probe').textContent).toContain('ga=false');
    expect(gaScripts()).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('действующее «Принять»: запроса нет, GA есть', async () => {
    setChoice(true);
    mount();
    await probeShows('choice=true');
    expect(gaScripts()).toHaveLength(2);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('действующий отказ: запроса нет, GA нет', async () => {
    setChoice(false);
    mount();
    await probeShows('choice=false');
    expect(gaScripts()).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('отказ старой версии и старше года по-прежнему отказ, в стране без плашки тоже', async () => {
    setChoice(false, 800, CONSENT_POLICY_VERSION + 3);
    stubFetch(answer(false));
    mount();
    await probeShows('choice=false');
    expect(gaScripts()).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('просроченное «Принять» не считается: решает регион', async () => {
    setChoice(true, 400);
    mount();
    await probeShows('region=required');
    expect(screen.getByTestId('probe').textContent).toContain('choice=none');
    expect(gaScripts()).toHaveLength(0);
  });

  it('регион в sessionStorage: запроса нет', async () => {
    window.sessionStorage.setItem(CONSENT_REGION_STORAGE_KEY, 'not-required');
    mount();
    await probeShows('region=not-required');
    expect(gaScripts()).toHaveLength(2);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('регион required в sessionStorage: запроса нет, GA нет', async () => {
    window.sessionStorage.setItem(CONSENT_REGION_STORAGE_KEY, 'required');
    stubFetch(answer(false));
    mount();
    await probeShows('region=required');
    expect(gaScripts()).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('GPC выключен (false): решает регион, в стране без плашки GA есть', async () => {
    setGpc(false);
    stubFetch(answer(false));
    mount();
    await probeShows('region=not-required');
    expect(screen.getByTestId('probe').textContent).toContain('gpc=false');
    expect(gaScripts()).toHaveLength(2);
  });

  it.each([
    ['статус 500', () => answer(false, false)],
    ['тело без boolean', () => answer('yes')],
    ['сеть упала', () => vi.fn().mockRejectedValue(new Error('offline'))],
  ])('%s: GA нет, ошибка в sessionStorage не пишется', async (_name, makeFetch) => {
    stubFetch(makeFetch());
    mount();
    await probeShows('region=required');
    expect(gaScripts()).toHaveLength(0);
    expect(window.sessionStorage.getItem(CONSENT_REGION_STORAGE_KEY)).toBeNull();
  });

  it('localStorage бросает исключение: поведение «выбора нет», без падения', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    stubFetch(answer(false));
    mount();
    await probeShows('region=not-required');
    expect(gaScripts()).toHaveLength(2);
  });

  it('/admin: GA нет даже там, где разрешён', async () => {
    nav.pathname = '/admin/books';
    stubFetch(answer(false));
    mount();
    await probeShows('ga=true');
    expect(gaScripts()).toHaveLength(0);
  });

  it('без measurementId GA нет', async () => {
    stubFetch(answer(false));
    mount('');
    await probeShows('ga=true');
    expect(gaScripts()).toHaveLength(0);
  });

  it('до ответа сервера состояние закрытое', () => {
    stubFetch(vi.fn(() => new Promise(() => {})));
    mount();
    expect(screen.getByTestId('probe').textContent).toBe(
      'region=unknown choice=none gpc=false ga=false'
    );
    expect(gaScripts()).toHaveLength(0);
  });

  it('StrictMode: двойной эффект не мешает решению, и регион пишется один раз', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    stubFetch(answer(false));
    render(
      <StrictMode>
        <ConsentProvider>
          <GoogleAnalytics measurementId={GA_ID} />
          <Probe />
        </ConsentProvider>
      </StrictMode>
    );
    await probeShows('region=not-required');
    expect(gaScripts()).toHaveLength(2);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const regionWrites = setItem.mock.calls.filter(([key]) => key === CONSENT_REGION_STORAGE_KEY);
    expect(regionWrites).toHaveLength(1);
  });

  it('useConsent вне провайдера бросает', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/ConsentProvider/);
  });

  describe('стоящие _ga и _ga_*', () => {
    beforeEach(() => {
      document.cookie = '_ga=GA1.1.1; path=/';
      document.cookie = '_ga_ABC=GS1.1.1; path=/';
      document.cookie = 'keep=1; path=/';
    });

    const expectGaCleared = async () => {
      await waitFor(() => expect(document.cookie).not.toContain('_ga'));
      expect(document.cookie).toContain('keep=1');
    };

    it('страна плашки: стираются, чужие cookie остаются', async () => {
      mount();
      await probeShows('region=required');
      await expectGaCleared();
    });

    it('GPC: стираются', async () => {
      setGpc(true);
      mount();
      await probeShows('gpc=true');
      await expectGaCleared();
    });

    it('действующий отказ: стираются', async () => {
      setChoice(false);
      mount();
      await probeShows('choice=false');
      await expectGaCleared();
    });

    it('ошибка маршрута: стираются', async () => {
      stubFetch(answer(false, false));
      mount();
      await probeShows('region=required');
      await expectGaCleared();
    });

    it('там, где GA можно, остаются', async () => {
      stubFetch(answer(false));
      mount();
      await probeShows('region=not-required');
      expect(document.cookie).toContain('_ga=');
      expect(document.cookie).toContain('_ga_ABC=');
    });
  });
});
