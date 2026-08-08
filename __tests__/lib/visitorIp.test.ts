import { describe, expect, it } from 'vitest';
import { VISITOR_IP_HEADER, visitorIpHeaderFrom } from '@/lib/visitor-ip';

/**
 * LEGACY-064. Вход в аккаунт выполняет сервер, поэтому для API все входы сайта
 * приходят с одного адреса. Без пересылки настоящего адреса лимитер отбивает
 * шестую попытку за минуту — у всех сразу.
 *
 * Отдельно закреплено, что функция **не падает** без запроса: она вызывается и
 * вне пользовательского контекста, и отказ там означал бы сломанный вход вместо
 * более грубого счёта.
 */
const carrier = (headers: Record<string, string>) => ({
  headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
});

describe('visitorIpHeaderFrom', () => {
  it('takes the address Cloudflare put in cf-connecting-ip', () => {
    const result = visitorIpHeaderFrom(carrier({ 'cf-connecting-ip': '198.51.100.7' }));
    expect(result).toEqual({ [VISITOR_IP_HEADER]: '198.51.100.7' });
  });

  it('falls back to the leftmost x-forwarded-for entry', () => {
    // Слева — исходный клиент, справа дописывают прокси.
    const result = visitorIpHeaderFrom(
      carrier({ 'x-forwarded-for': '198.51.100.7, 172.16.0.1, 10.0.0.1' })
    );
    expect(result).toEqual({ [VISITOR_IP_HEADER]: '198.51.100.7' });
  });

  it('prefers cf-connecting-ip over x-forwarded-for', () => {
    // XFF клиент может прислать сам; cf-connecting-ip ставит и переписывает CF.
    const result = visitorIpHeaderFrom(
      carrier({ 'cf-connecting-ip': '198.51.100.7', 'x-forwarded-for': '203.0.113.9' })
    );
    expect(result).toEqual({ [VISITOR_IP_HEADER]: '198.51.100.7' });
  });

  it('returns nothing when there is no request at all', () => {
    expect(visitorIpHeaderFrom(undefined)).toEqual({});
    expect(visitorIpHeaderFrom(null)).toEqual({});
  });

  it('returns nothing when the request carries no address', () => {
    expect(visitorIpHeaderFrom(carrier({}))).toEqual({});
  });

  it('does not throw when reading headers fails', () => {
    const broken = {
      headers: {
        get: () => {
          throw new Error('no request scope');
        },
      },
    };
    expect(() => visitorIpHeaderFrom(broken)).not.toThrow();
    expect(visitorIpHeaderFrom(broken)).toEqual({});
  });
});
