'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { fetchConsentRegion } from '@/api/endpoints/consent-region';
import {
  readCachedRegion,
  readConsentChoice,
  writeCachedRegion,
  writeConsentChoice,
  type CachedRegion,
  type StoredConsent,
} from './consent-storage';
import {
  clearGaCookies,
  GA_MEASUREMENT_ID,
  isAnalyticsExcludedPath,
  setGaDisabled,
} from './ga-cookies';

export type ConsentRegion = 'unknown' | CachedRegion;

export interface ConsentState {
  region: ConsentRegion;
  choice: StoredConsent | null;
  /** Браузер передал Global Privacy Control: отказ главнее любого выбора и любой страны. */
  gpc: boolean;
  analyticsAllowed: boolean;
  /** Решение принято (GPC, сохранённый выбор или регион). До него состояние закрытое и не окончательное. */
  ready: boolean;
}

const INITIAL_STATE: ConsentState = {
  region: 'unknown',
  choice: null,
  gpc: false,
  analyticsAllowed: false,
  ready: false,
};

export interface ConsentContextValue extends ConsentState {
  /** Плашка видна: регион плашки без выбора или открыта кнопкой «Настройки cookie». */
  bannerVisible: boolean;
  /** Кнопка «Настройки cookie» в подвале: регион плашки или сохранённый выбор (при GPC нет ни того, ни другого). */
  settingsAvailable: boolean;
  /** Сохранить выбор: `true` - «Принять», `false` - «Отклонить» или отключение на `/cookies`. */
  decide: (analytics: boolean) => void;
  openConsentBanner: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

// Плашка нужна малой доле посетителей, а провайдер стоит в корневом layout: статический импорт
// положил бы её в First Load каждого маршрута. Грузится, только когда её надо показать.
const ConsentBanner = dynamic(
  () => import('@/components/public/legal/ConsentBanner').then((mod) => mod.ConsentBanner),
  { ssr: false }
);

/** Состояние согласия. Вне `ConsentProvider` бросает: обрыв контекста должен краснеть сразу. */
export function useConsent(): ConsentContextValue {
  const state = useContext(ConsentContext);
  if (!state) throw new Error('useConsent must be used inside ConsentProvider');
  return state;
}

const isGpcOn = (): boolean =>
  (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;

/**
 * Решает, можно ли грузить Google Analytics (`F01`, `tech.md` §4.4). Порядок: GPC - отказ;
 * действующий выбор - как выбрано; иначе регион: в странах плашки и пока он неизвестен -
 * нельзя, в остальных - можно. Страница рендерится на сервере с `analyticsAllowed: false`,
 * решение принимается после монтирования: провайдер не читает ни `headers()`, ни `cookies()`
 * и статичность страниц не задевает.
 */
export function ConsentProvider({
  children,
  measurementId = GA_MEASUREMENT_ID,
}: {
  children: ReactNode;
  /** Только для выключателя `ga-disable-<ID>` при отзыве; по умолчанию - ID из окружения. */
  measurementId?: string;
}) {
  const [state, setState] = useState<ConsentState>(INITIAL_STATE);
  const [bannerRequested, setBannerRequested] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    if (isGpcOn()) {
      setState({
        region: 'unknown',
        choice: null,
        gpc: true,
        analyticsAllowed: false,
        ready: true,
      });
      clearGaCookies();
      return;
    }

    const choice = readConsentChoice();
    if (choice) {
      setState({
        region: 'unknown',
        choice,
        gpc: false,
        analyticsAllowed: choice.analytics,
        ready: true,
      });
      if (!choice.analytics) clearGaCookies();
      return;
    }

    const apply = (region: CachedRegion) => {
      if (cancelled) return;
      const analyticsAllowed = region === 'not-required';
      setState({ region, choice: null, gpc: false, analyticsAllowed, ready: true });
      if (!analyticsAllowed) clearGaCookies();
    };

    const cached = readCachedRegion();
    if (cached) {
      apply(cached);
      return;
    }

    void fetchConsentRegion().then(({ region, fromServer }) => {
      if (cancelled) return;
      if (fromServer) writeCachedRegion(region);
      apply(region);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const decide = useCallback(
    (analytics: boolean) => {
      // До решения провайдера выбор не принимается: иначе ответ о регионе, пришедший позже,
      // перезаписал бы его. Интерфейс выбора до решения недоступен - это вторая линия.
      if (state.gpc || !state.ready) return;
      const choice = writeConsentChoice(analytics);
      // Отказ: уже загруженный gtag останавливается флагом, cookie стираются. Повторное
      // «Принять» в той же загрузке снимает флаг - иначе согласие осталось бы без действия.
      setGaDisabled(!analytics, measurementId);
      if (!analytics) clearGaCookies();
      setBannerRequested(false);
      setState((prev) => ({ ...prev, choice, analyticsAllowed: analytics, ready: true }));
    },
    [state.gpc, state.ready, measurementId]
  );

  const openConsentBanner = useCallback(() => setBannerRequested(true), []);

  const value = useMemo<ConsentContextValue>(() => {
    const bannerVisible =
      !state.gpc &&
      !isAnalyticsExcludedPath(pathname) &&
      (bannerRequested || (state.region === 'required' && state.choice === null));
    const settingsAvailable = state.region === 'required' || state.choice !== null;
    return { ...state, bannerVisible, settingsAvailable, decide, openConsentBanner };
  }, [state, bannerRequested, pathname, decide, openConsentBanner]);

  return (
    <ConsentContext.Provider value={value}>
      {children}
      {value.bannerVisible && <ConsentBanner />}
    </ConsentContext.Provider>
  );
}
