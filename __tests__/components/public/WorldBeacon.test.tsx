import { StrictMode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Link from 'next/link';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorldBeacon } from '@/components/public/WorldBeacon';
import { classifyWorldHref } from '@/lib/world-beacon';

/**
 * F08-3b, `product.md` §14: `view` раз на загрузку, переход по ссылке - своё событие, первый такой
 * переход - ещё и `engaged` (раз). Транспорт - `fetch` с JSON и `keepalive`, без кук; отказ сети
 * страницу не ломает.
 */

const fetchMock = vi.fn();

/** Событие `auxclick` (средняя кнопка - `button: 1`), всплывающее до обёртки. */
const auxClick = (button: number) =>
  new MouseEvent('auxclick', { bubbles: true, cancelable: true, button });

const sent = () =>
  fetchMock.mock.calls.map(
    ([, init]) => JSON.parse((init as RequestInit).body as string) as Record<string, unknown>
  );

const renderBeacon = (entityKey?: string) =>
  render(
    <WorldBeacon bookVersionId="ver-1" entityKey={entityKey}>
      <Link href="/en/book/hamlet/read">read</Link>
      <Link href="/en/book/hamlet/listen#ch1">listen</Link>
      <Link href="/en/book/hamlet/wiki/ophelia">hero</Link>
      <Link href="/en/book/hamlet/analysis">analysis</Link>
      <Link href="/en/book/hamlet/summary/2">summary</Link>
      <Link href="/en/author/shakespeare">author</Link>
      <Link href="https://example.com/read">external</Link>
      <Link href="/en/book/hamlet/read">
        <span>nested</span>
      </Link>
    </WorldBeacon>
  );

describe('WorldBeacon', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('на монтировании шлёт view один раз, повторный рендер не шлёт', () => {
    const { rerender } = renderBeacon();
    rerender(
      <WorldBeacon bookVersionId="ver-1">
        <p>again</p>
      </WorldBeacon>
    );

    expect(sent().filter((b) => b.event === 'view')).toHaveLength(1);
  });

  it('в StrictMode (двойной эффект) view всё равно один', () => {
    render(
      <StrictMode>
        <WorldBeacon bookVersionId="ver-1">
          <p>x</p>
        </WorldBeacon>
      </StrictMode>
    );

    expect(sent().filter((b) => b.event === 'view')).toHaveLength(1);
  });

  it('тело запроса - только bookVersionId и event; у общей страницы поля key нет', () => {
    renderBeacon();

    expect(sent()).toEqual([{ bookVersionId: 'ver-1', event: 'view' }]);
  });

  it('у страницы сущности в теле есть key', () => {
    renderBeacon('ophelia');

    expect(sent()).toEqual([{ bookVersionId: 'ver-1', key: 'ophelia', event: 'view' }]);
  });

  it('транспорт: POST JSON, keepalive, без кук и без лишних заголовков', () => {
    renderBeacon();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(url).toBe('/api/world/beacon');
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBe(true);
    expect(init.credentials).toBe('omit');
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.has('authorization')).toBe(false);
  });

  it('первый переход: событие ссылки и engaged; второй - только событие ссылки', () => {
    renderBeacon();
    fetchMock.mockClear();

    fireEvent.click(screen.getByText('read'));
    expect(sent().map((b) => b.event)).toEqual(['to_reader', 'engaged']);

    fireEvent.click(screen.getByText('listen'));
    fireEvent.click(screen.getByText('analysis'));
    expect(sent().map((b) => b.event)).toEqual(['to_reader', 'engaged', 'to_audio', 'to_analysis']);
    expect(sent().filter((b) => b.event === 'engaged')).toHaveLength(1);
  });

  it('клик по вложенному элементу ссылки считается', () => {
    renderBeacon();
    fetchMock.mockClear();

    fireEvent.click(screen.getByText('nested'));

    expect(sent().map((b) => b.event)).toEqual(['to_reader', 'engaged']);
  });

  it('средняя кнопка (auxclick) по ссылке в читалку - то же событие и engaged один раз', () => {
    renderBeacon('ophelia');
    fetchMock.mockClear();

    fireEvent(screen.getByText('read'), auxClick(1));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/world/beacon',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ bookVersionId: 'ver-1', key: 'ophelia', event: 'to_reader' }),
      })
    );
    expect(sent().map((b) => b.event)).toEqual(['to_reader', 'engaged']);

    fireEvent(screen.getByText('listen'), auxClick(1));
    fireEvent.click(screen.getByText('analysis'));

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(sent().map((b) => b.event)).toEqual(['to_reader', 'engaged', 'to_audio', 'to_analysis']);
  });

  it('auxclick правой кнопкой (button 2) не считается', () => {
    renderBeacon();
    fetchMock.mockClear();

    fireEvent(screen.getByText('read'), auxClick(2));

    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it('после размонтирования ни click, ни auxclick не шлют', () => {
    const { unmount } = renderBeacon();
    const link = screen.getByText('read');
    fetchMock.mockClear();
    unmount();

    fireEvent.click(link);
    fireEvent(link, auxClick(1));

    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  it('чужие ссылки и клик мимо ссылок ничего не шлют, engaged не тратят', () => {
    renderBeacon();
    fetchMock.mockClear();

    fireEvent.click(screen.getByText('author'));
    fireEvent.click(screen.getByText('external'));
    fireEvent.click(document.body);
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('hero'));
    expect(sent().map((b) => b.event)).toEqual(['to_world', 'engaged']);
  });

  it('отказ сети и синхронное исключение fetch страницу не ломают', async () => {
    fetchMock.mockRejectedValue(new TypeError('network'));
    renderBeacon();
    fireEvent.click(screen.getByText('summary'));
    await Promise.resolve();

    fetchMock.mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => fireEvent.click(screen.getByText('read'))).not.toThrow();
  });
});

describe('classifyWorldHref', () => {
  it.each([
    ['/en/book/hamlet/read', 'to_reader'],
    ['/en/book/hamlet/read/3', 'to_reader'],
    ['/ru/book/hamlet/listen', 'to_audio'],
    ['/en/book/hamlet/wiki', 'to_world'],
    ['/en/book/hamlet/wiki/ophelia?x=1', 'to_world'],
    ['/en/book/hamlet/analysis#themes', 'to_analysis'],
    ['/en/book/hamlet/summary/2', 'to_summary'],
    ['https://bibliaris.com/fr/book/hamlet-fr/summary', 'to_summary'],
    ['/en/book/hamlet', null],
    ['/en/book/hamlet/readme', null],
    ['/en/author/shakespeare', null],
    ['/en/read', null],
    ['#top', null],
    ['', null],
    [undefined, null],
  ])('%s -> %s', (href, expected) => {
    expect(classifyWorldHref(href)).toBe(expected);
  });
});
