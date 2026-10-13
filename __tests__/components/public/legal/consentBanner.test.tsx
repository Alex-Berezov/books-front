import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { ConsentChoice } from '@/components/public/legal/ConsentChoice';
import { CookieSettingsButton } from '@/components/public/legal/CookieSettingsButton';
import { CONSENT_STORAGE_KEY } from '@/lib/consent/consent-storage';
import { CONSENT_POLICY_VERSION } from '@/lib/consent/consent-version';
import { ConsentProvider, useConsent } from '@/lib/consent/ConsentProvider';

/**
 * Плашка, «Настройки cookie» и «Ваш выбор» (`F01-3`, `product.md` §7, `tech.md` §4.4). Провайдер
 * настоящий, подменены только сеть, `next/navigation` и `next/script`.
 */

const nav = { pathname: '/en' };
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));
vi.mock('next/script', () => ({
  default: ({ src, id }: { src?: string; id?: string }) => (
    <span data-testid="ga-script" data-src={src ?? id} />
  ),
}));

const GA_ID = 'G-TEST';
const GA_FLAG = `ga-disable-${GA_ID}`;
const EXPIRED = 'Thu, 01 Jan 1970 00:00:00 GMT';
const flags = window as unknown as Record<string, unknown>;

const answer = (consentRequired: unknown, ok = true) =>
  vi.fn().mockResolvedValue({ ok, json: async () => ({ consentRequired }) });

/** Ответ о регионе, который тест отпускает сам: так видно, что случится с кликом до него. */
const deferredAnswer = () => {
  let release: (consentRequired: boolean) => void = () => {};
  const mock = vi.fn(
    () =>
      new Promise((resolve) => {
        release = (consentRequired) =>
          resolve({ ok: true, json: async () => ({ consentRequired }) });
      })
  );
  return { mock, release: (consentRequired: boolean) => release(consentRequired) };
};

const setChoice = (analytics: boolean, version = CONSENT_POLICY_VERSION) =>
  window.localStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({
      analytics,
      decidedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      version,
    })
  );

const setGpc = (value: boolean) =>
  Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value });

/** Прямой вызов `decide` мимо интерфейса: проверяет защиту самого провайдера. */
function DecideProbe({ analytics }: { analytics: boolean }) {
  const { decide } = useConsent();
  return (
    <button type="button" onClick={() => decide(analytics)}>
      {`probe-${analytics}`}
    </button>
  );
}

const mount = (probe?: boolean) =>
  render(
    <ConsentProvider measurementId={GA_ID}>
      <GoogleAnalytics measurementId={GA_ID} />
      <ul>
        <CookieSettingsButton label="Cookie Settings" wrapper="li" />
      </ul>
      <ConsentChoice />
      {probe !== undefined && <DecideProbe analytics={probe} />}
    </ConsentProvider>
  );

const banner = () => screen.queryByRole('region', { name: 'Cookie consent' });
const findBanner = () => screen.findByRole('region', { name: 'Cookie consent' });
const gaScripts = () => screen.queryAllByTestId('ga-script');
const settingsButton = () => screen.queryByRole('button', { name: 'Cookie Settings' });
const storedChoice = () => JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY) ?? 'null');

/** GPC прочитан провайдером: блок «Ваш выбор» сменил текст на фразу про сигнал. */
const gpcApplied = () =>
  waitFor(() =>
    expect(screen.getByTestId('consent-choice').textContent).toContain('Global Privacy Control')
  );
/** Провайдер решил, что кнопка настроек нужна (регион плашки или сохранённый выбор). */
const settingsShown = () => waitFor(() => expect(settingsButton()).not.toBeNull());

const clearAllCookies = () => {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0].trim();
    if (name) document.cookie = `${name}=; expires=${EXPIRED}; path=/`;
  }
};

describe('плашка cookie', () => {
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
    Reflect.deleteProperty(flags, GA_FLAG);
    Reflect.deleteProperty(flags, 'gtag');
    clearAllCookies();
  });

  it('страна плашки без выбора: плашка есть, GA нет, кнопка настроек есть', async () => {
    mount();
    const region = await findBanner();
    expect(gaScripts()).toHaveLength(0);
    expect(settingsButton()).not.toBeNull();
    expect(within(region).getByRole('link', { name: 'Cookie Policy' }).getAttribute('href')).toBe(
      '/en/cookies'
    );
  });

  it('две кнопки одного вида, без крестика, фокус не забирается', async () => {
    mount();
    const region = await findBanner();
    const buttons = within(region).getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual(['Accept', 'Reject']);
    expect(buttons[0].className).toBe(buttons[1].className);
    expect(region.contains(document.activeElement)).toBe(false);
  });

  it('первый показ плашки - без строки текущего выбора', async () => {
    mount();
    const region = await findBanner();
    expect(within(region).queryByTestId('consent-current')).toBeNull();
  });

  it('«Принять»: GA есть без перезагрузки, плашки нет, в хранилище согласие текущей версии', async () => {
    mount();
    await userEvent.click(within(await findBanner()).getByRole('button', { name: 'Accept' }));
    expect(banner()).toBeNull();
    expect(gaScripts()).toHaveLength(2);
    expect(storedChoice()).toMatchObject({ analytics: true, version: CONSENT_POLICY_VERSION });
  });

  it('«Отклонить»: GA нет, плашки нет, отказ сохранён', async () => {
    mount();
    await userEvent.click(within(await findBanner()).getByRole('button', { name: 'Reject' }));
    expect(banner()).toBeNull();
    expect(gaScripts()).toHaveLength(0);
    expect(storedChoice()).toMatchObject({ analytics: false });
  });

  it('«Принять» старой версии политики в регионе плашки: плашка снова, GA нет', async () => {
    setChoice(true, CONSENT_POLICY_VERSION - 1);
    mount();
    await findBanner();
    expect(gaScripts()).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('остальные страны: плашки и кнопки настроек нет, GA есть', async () => {
    stubFetch(answer(false));
    mount();
    await waitFor(() => expect(gaScripts()).toHaveLength(2));
    expect(banner()).toBeNull();
    expect(settingsButton()).toBeNull();
  });

  it('ошибка маршрута: плашка есть, GA нет', async () => {
    stubFetch(answer(undefined, false));
    mount();
    await findBanner();
    expect(gaScripts()).toHaveLength(0);
  });

  it('GPC при сохранённом «Принять»: ни плашки, ни кнопки, ни GA, запроса нет', async () => {
    setGpc(true);
    setChoice(true);
    mount();
    await gpcApplied();
    expect(banner()).toBeNull();
    expect(settingsButton()).toBeNull();
    expect(gaScripts()).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('GPC: прямой вызов decide(true) не пишет согласие и не включает GA', async () => {
    setGpc(true);
    stubFetch(answer(false));
    mount(true);
    await gpcApplied();
    await userEvent.click(screen.getByRole('button', { name: 'probe-true' }));
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
    expect(gaScripts()).toHaveLength(0);
  });

  it('/admin: плашки нет даже в стране плашки', async () => {
    nav.pathname = '/admin/en';
    mount();
    await settingsShown();
    expect(banner()).toBeNull();
  });

  it('сохранённый выбор: кнопка настроек открывает плашку с текущим выбором', async () => {
    setChoice(true);
    mount();
    await settingsShown();
    expect(banner()).toBeNull();
    await userEvent.click(settingsButton()!);
    const region = await findBanner();
    expect(within(region).getByTestId('consent-current').textContent).toBe('Analytics is on');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('отзыв через плашку: gtag выключен флагом, _ga* стёрты, GA снят; повторное «Принять» включает снова', async () => {
    const gtag = vi.fn();
    flags.gtag = gtag;
    setChoice(true);
    mount();
    await waitFor(() => expect(gaScripts()).toHaveLength(2));
    document.cookie = '_ga=GA1.1.1; path=/';
    document.cookie = '_ga_TEST=GS1.1.1; path=/';
    document.cookie = 'other=1; path=/';

    await userEvent.click(settingsButton()!);
    await userEvent.click(within(await findBanner()).getByRole('button', { name: 'Reject' }));
    expect(gaScripts()).toHaveLength(0);
    expect(flags[GA_FLAG]).toBe(true);
    expect(document.cookie).not.toMatch(/_ga/);
    expect(document.cookie).toContain('other=1');

    await userEvent.click(settingsButton()!);
    await userEvent.click(within(await findBanner()).getByRole('button', { name: 'Accept' }));
    expect(gaScripts()).toHaveLength(2);
    expect(GA_FLAG in flags).toBe(false);
    // Уже загруженный gtag заново получает `config`: `next/script` повторно его не запустит.
    expect(gtag).toHaveBeenCalledWith('config', GA_ID);
  });
});

describe('«Ваш выбор» на /cookies', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    nav.pathname = '/en/cookies';
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'globalPrivacyControl');
    Reflect.deleteProperty(flags, GA_FLAG);
    clearAllCookies();
  });

  it('вне региона плашки: аналитика включена, выключение - отказ без перезагрузки', async () => {
    vi.stubGlobal('fetch', answer(false));
    mount();
    await screen.findByText('Analytics is on');
    await userEvent.click(screen.getByRole('button', { name: 'Turn off analytics' }));
    expect(screen.getByText('Analytics is off')).toBeTruthy();
    expect(gaScripts()).toHaveLength(0);
    expect(storedChoice()).toMatchObject({ analytics: false });
  });

  it('в регионе плашки без выбора: выключена, включение равно «Принять»', async () => {
    vi.stubGlobal('fetch', answer(true));
    mount();
    await findBanner();
    expect(screen.getByText('Analytics is off')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Turn on analytics' }));
    expect(gaScripts()).toHaveLength(2);
    expect(banner()).toBeNull();
    expect(storedChoice()).toMatchObject({ analytics: true });
  });

  it('до решения провайдера статуса нет и переключатель недоступен', async () => {
    const region = deferredAnswer();
    vi.stubGlobal('fetch', region.mock);
    mount();
    const block = screen.getByTestId('consent-choice');
    expect(block.textContent).not.toMatch(/Analytics is (on|off)/);
    expect((within(block).getByRole('button') as HTMLButtonElement).disabled).toBe(true);
    await act(async () => region.release(false));
    await screen.findByText('Analytics is on');
  });

  it('выбор до решения провайдера не принимается, ответ о регионе решает как обычно', async () => {
    const region = deferredAnswer();
    vi.stubGlobal('fetch', region.mock);
    mount(false);
    await waitFor(() => expect(region.mock).toHaveBeenCalled());
    await userEvent.click(screen.getByRole('button', { name: 'probe-false' }));
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
    // Ответ о регионе приходит после клика; `act` дожидается всей цепочки промисов и рендера.
    await act(async () => region.release(false));
    expect(screen.getByText('Analytics is on')).toBeTruthy();
    expect(gaScripts()).toHaveLength(2);
  });

  it('GPC: текст про сигнал, переключатель недоступен', async () => {
    setGpc(true);
    vi.stubGlobal('fetch', answer(false));
    mount();
    await gpcApplied();
    const button = within(screen.getByTestId('consent-choice')).getByRole('button');
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });
});
