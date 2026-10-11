import { signOut } from 'next-auth/react';
import { SIGN_IN_REASON_PARAM, sessionEndReasonDictKey } from '@/lib/auth/constants';
import { clearLoggedInMarker } from '@/lib/auth/sessionMarker';
import { getLangFromPath } from '@/lib/i18n/lang';
import { translate } from '@/lib/i18n/translate';
import { toast } from '@/lib/utils/toast';
import type { AuthErrorType } from '@/lib/auth/constants';

/**
 * Тихий выход из мёртвой сессии (`LEGACY-466`, решение арбитра 11.10.2026, `decisions-log.md`).
 *
 * Сессия снимается без перехода (`redirect: false`), и дальше всё зависит от страницы:
 *
 * - **админка** — переход на вход своего языка с причиной и адресом возврата: без сессии
 *   в ней делать нечего, а адрес возврата терять нельзя;
 * - **сайт** — страница остаётся, один тост с причиной. 🔴 Читатель посреди книги на форму входа
 *   не уходит: чтение открыто анониму (решение владельца 22.08.2026), прогресс после выхода
 *   пишется локально (`lib/reading-progress/useProgressTarget.ts`).
 *
 * Страница, в адресе которой причина уже есть (вход после редиректа middleware), тост не
 * дублирует — причину над формой показывает она сама.
 *
 * ⚠️ Выход по 401 личной ручки идёт другим путём — `handleAuthFailure` (`lib/http-client/auth.ts`),
 * его поведение эта функция не меняет (граница решения арбитра).
 */
/**
 * Страница входа и соседние (`/{lang}/auth/**`): выход отсюда не запускается. Новый вход сам
 * перезапишет куку, а выход, долетевший после него, стёр бы уже новую сессию.
 */
export const isAuthPagePath = (pathname: string): boolean => /^\/[^/]+\/auth(\/|$)/.test(pathname);

export const endDeadSession = async (
  reason: AuthErrorType,
  location: Pick<Location, 'pathname' | 'search' | 'assign'> = window.location
): Promise<void> => {
  await signOut({ redirect: false });
  // После выхода, а не до: отказ выхода оставил бы куку жить без отметки, и после перезагрузки
  // провайдер не спросил бы сессию вовсе (тот же порядок — `lib/auth/sign-out.ts`).
  clearLoggedInMarker();

  const { pathname, search } = location;
  const lang = getLangFromPath(pathname);

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const query = new URLSearchParams({
      callbackUrl: `${pathname}${search}`,
      [SIGN_IN_REASON_PARAM]: reason,
    });
    location.assign(`/${lang}/auth/sign-in?${query.toString()}`);
    return;
  }

  if (new URLSearchParams(search).has(SIGN_IN_REASON_PARAM)) return;
  const key = sessionEndReasonDictKey(reason);
  if (!key) return;
  toast.info(translate(lang, key));
};
