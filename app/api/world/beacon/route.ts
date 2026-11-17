/**
 * Приём счётчика страниц мира книги (F08-3b, `product.md` §14, решение арбитра `F08 | F08-3` Q5).
 *
 * Зачем свой маршрут, а не прямой запрос браузера в API и не `app/api/backend`. Лимит ручки
 * `POST api/world/beacon` (60 событий в минуту) считается по `X-Visitor-IP`, а запрос, пришедший
 * с сервера фронта без этого заголовка, идёт без лимита вовсе (`LEGACY-064`). Прокси
 * `app/api/backend` требует сессию и анониму отказывает, а читатель мира книги - аноним.
 *
 * Что уходит в API: только `Content-Type`, `X-Visitor-IP` и `User-Agent` (ботов глушит бэкенд по
 * нему, `isBotUserAgent`) - ни кук, ни `Authorization`, ни остальных заголовков браузера. Тело
 * пересобирается из трёх известных полей. Ответ API не кэшируется и без кук. Адреса посетителя нет
 * (нет ни `cf-connecting-ip`, ни `x-forwarded-for`) - 204 без пересылки: событие без лимита в API
 * не уходит.
 */

import { NextResponse } from 'next/server';
import {
  checkDeclaredLength,
  checkProxyOrigin,
  isProxyRefusal,
  readLimitedBody,
  upstreamUrlFor,
} from '@/lib/backend-proxy';
import { BACKEND_PROXY_MAX_BODY_BYTES } from '@/lib/backend-proxy.constants';
import { API_BASE_URL, HEADER_VALUE, HTTP_HEADER, HTTP_STATUS } from '@/lib/http.constants';
import { getSiteUrl } from '@/lib/seo/urls';
import { visitorIpHeaderFrom } from '@/lib/visitor-ip';
import { WORLD_BEACON_EVENTS } from '@/lib/world-beacon';
import type { ProxyRefusal } from '@/lib/backend-proxy';
import type { WorldBeaconRequest } from '@/types/api-schema';

export const dynamic = 'force-dynamic';

const NO_STORE = 'private, no-store';

/** Событие - копейки: ждать API дольше пяти секунд незачем. */
const UPSTREAM_TIMEOUT_MS = 5_000;

/** Событие без адреса посетителя не считается, но и не отказ: тот же ответ, что у принятого. */
const NO_CONTENT = 204;

const reply = (status: number): NextResponse =>
  new NextResponse(null, { status, headers: { 'Cache-Control': NO_STORE } });

const refuse = ({ status }: ProxyRefusal): NextResponse => reply(status);

/** Тело события из трёх известных полей или `null`: лишнее поле и чужой тип - отказ (400). */
const parseBeacon = (raw: string): WorldBeaconRequest | null => {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const { bookVersionId, key, event, ...rest } = data as Record<string, unknown>;
  if (Object.keys(rest).length > 0) return null;
  if (typeof bookVersionId !== 'string' || !bookVersionId) return null;
  if (key !== undefined && (typeof key !== 'string' || !key)) return null;
  if (typeof event !== 'string' || !(WORLD_BEACON_EVENTS as readonly string[]).includes(event)) {
    return null;
  }
  return {
    bookVersionId,
    ...(key === undefined ? {} : { key }),
    event: event as WorldBeaconRequest['event'],
  };
};

export async function POST(req: Request): Promise<Response> {
  const originRefusal = checkProxyOrigin(req.headers, new URL(getSiteUrl()).origin);
  if (originRefusal) return refuse(originRefusal);

  const lengthRefusal = checkDeclaredLength(req.headers);
  if (lengthRefusal) return refuse(lengthRefusal);

  const raw = await readLimitedBody(req.body);
  if (isProxyRefusal(raw)) return refuse(raw);
  if (raw === null || raw.byteLength > BACKEND_PROXY_MAX_BODY_BYTES) {
    return reply(HTTP_STATUS.BAD_REQUEST);
  }
  const beacon = parseBeacon(new TextDecoder().decode(raw));
  if (!beacon) return reply(HTTP_STATUS.BAD_REQUEST);

  // Без адреса посетителя событие ушло бы в API без `X-Visitor-IP`, то есть мимо лимита
  // (`LEGACY-064`): такое событие не считается, ответ тот же, что у принятого.
  const visitorIp = visitorIpHeaderFrom(req);
  if (Object.keys(visitorIp).length === 0) return reply(NO_CONTENT);

  const upstreamUrl = upstreamUrlFor(API_BASE_URL, '/world/beacon', '');
  if (isProxyRefusal(upstreamUrl)) return refuse(upstreamUrl);

  const headers = new Headers(visitorIp);
  headers.set(HTTP_HEADER.CONTENT_TYPE, HEADER_VALUE.JSON);
  const userAgent = req.headers.get('user-agent');
  if (userAgent) headers.set('User-Agent', userAgent);

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(beacon),
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    return reply(upstream.status);
  } catch {
    return reply(HTTP_STATUS.BAD_GATEWAY);
  }
}
