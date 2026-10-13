'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchConsentRegion } from '@/api/endpoints/consent-region';
import {
  readCachedRegion,
  readConsentChoice,
  writeCachedRegion,
  type CachedRegion,
  type StoredConsent,
} from './consent-storage';
import { clearGaCookies } from './ga-cookies';

export type ConsentRegion = 'unknown' | CachedRegion;

export interface ConsentState {
  region: ConsentRegion;
  choice: StoredConsent | null;
  /** Браузер передал Global Privacy Control: отказ главнее любого выбора и любой страны. */
  gpc: boolean;
  analyticsAllowed: boolean;
}

const INITIAL_STATE: ConsentState = {
  region: 'unknown',
  choice: null,
  gpc: false,
  analyticsAllowed: false,
};

const ConsentContext = createContext<ConsentState | null>(null);

/** Состояние согласия. Вне `ConsentProvider` бросает: обрыв контекста должен краснеть сразу. */
export function useConsent(): ConsentState {
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
export function ConsentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConsentState>(INITIAL_STATE);

  useEffect(() => {
    let cancelled = false;

    if (isGpcOn()) {
      setState({ region: 'unknown', choice: null, gpc: true, analyticsAllowed: false });
      clearGaCookies();
      return;
    }

    const choice = readConsentChoice();
    if (choice) {
      setState({ region: 'unknown', choice, gpc: false, analyticsAllowed: choice.analytics });
      if (!choice.analytics) clearGaCookies();
      return;
    }

    const apply = (region: CachedRegion) => {
      if (cancelled) return;
      const analyticsAllowed = region === 'not-required';
      setState({ region, choice: null, gpc: false, analyticsAllowed });
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

  return <ConsentContext.Provider value={state}>{children}</ConsentContext.Provider>;
}
