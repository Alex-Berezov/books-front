import { NextResponse } from 'next/server';
import { visitorCountryFrom } from '@/lib/backend-proxy';
import { isConsentRequired } from '@/lib/consent/consent-countries';

export const dynamic = 'force-dynamic';

/**
 * Нужна ли посетителю плашка согласия на cookie (`F01`). Страна берётся из `cf-ipcountry`
 * (его ставит Cloudflare сайта) и наружу не отдаётся - только вывод. Ответ личный и не
 * кэшируется: одно и то же значение нельзя отдавать посетителю из другой страны.
 */
export function GET(request: Request) {
  const consentRequired = isConsentRequired(visitorCountryFrom(request.headers));
  return NextResponse.json(
    { consentRequired },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
