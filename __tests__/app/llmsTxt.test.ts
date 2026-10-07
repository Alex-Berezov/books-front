// @vitest-environment node
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import robots from '@/app/robots';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import { LLMS_HUBS } from '@/lib/seo/llms';

/**
 * Lighthouse проверяет `/llms.txt`: Markdown, хотя бы один H1, ответ без таймаута.
 * Раньше адрес уходил в `[lang]` и отвечал 404. Хост зафиксирован литералом, чтобы
 * ожидания не считались той же функцией, что и сам файл.
 */
const SITE = 'https://bibliaris.test';

const getBookCards = vi.fn();
vi.mock('@/api/endpoints/public', () => ({
  getBookCards: (...args: unknown[]) => getBookCards(...args) as unknown,
}));

const withTotal = (total: number) => ({
  items: [],
  pagination: { total, page: 1, limit: 1, totalPages: total },
});

const robotsLists = () => {
  const rules = robots().rules;
  const pick = (key: 'allow' | 'disallow'): string[] =>
    Array.isArray(rules) ? [] : ([] as string[]).concat(rules[key] ?? []);
  return { allow: pick('allow'), disallow: pick('disallow') };
};

/** Маршрут держит счётчики в памяти процесса, поэтому каждый тест берёт свежий модуль. */
const loadGet = async () => {
  vi.resetModules();
  return (await import('@/app/llms.txt/route')).GET;
};
const GET = async () => (await loadGet())();

describe('/llms.txt', () => {
  beforeAll(() => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE);
  });
  beforeEach(() => {
    getBookCards.mockReset();
    getBookCards.mockResolvedValue(withTotal(3));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('отдаёт Markdown ровно с одним H1', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    const body = await res.text();
    expect(body.match(/^# /gm)).toHaveLength(1);
    expect(body.startsWith('# Bibliaris\n\n> ')).toBe(true);
    expect(body).not.toMatch(/\.\. /);
    expect(body).toContain(`[Sitemap](${SITE}/sitemap.xml)`);
  });

  it('даёт каждый хаб на каждом языке с подписью из словаря', async () => {
    const body = await (await GET()).text();
    for (const lang of SUPPORTED_LANGS) {
      const header = getDictionary(lang).header;
      for (const hub of LLMS_HUBS) {
        expect(header[hub.label].trim()).not.toBe('');
        expect(body).toContain(`- [${header[hub.label]}](${SITE}/${lang}${hub.path})`);
      }
    }
  });

  /**
   * Список хабов ведётся руками рядом с меню и `robots.ts`. Первая версия файла уже потеряла
   * `/popular-books` — посадка краснеет, когда хаб открыт в robots, а в `/llms.txt` его нет.
   * Юридические страницы — не хабы.
   */
  it('перечисляет каждый хаб, открытый в robots.txt', () => {
    const hubs = robotsLists()
      .allow.map((rule) => /^\/\*\/([a-z-]+)$/.exec(rule)?.[1])
      .filter((seg): seg is string => !!seg && !['privacy', 'terms', 'deletion'].includes(seg));
    expect(hubs.length).toBeGreaterThan(0);
    expect(LLMS_HUBS.map((h) => h.path.slice(1))).toEqual(expect.arrayContaining(hubs));
  });

  /**
   * Лендинги со счётчиком решаются так же, как в карте сайта: известно пустой — без ссылки
   * (страница сама отдаёт `noindex`), неизвестно — ссылка остаётся.
   */
  it('пропускает лендинг, пустой на этом языке, и оставляет при отказе API', async () => {
    getBookCards.mockImplementation(
      async (lang: string, _p: number, _l: number, params: { type?: string; sort?: string }) => {
        if (lang === 'fr' && params.type === 'audio') return withTotal(0);
        if (lang === 'es' && params.sort === 'new') throw new Error('upstream down');
        return withTotal(3);
      }
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const body = await (await GET()).text();
    expect(body).not.toContain(`${SITE}/fr/audiobooks)`);
    expect(body).toContain(`${SITE}/en/audiobooks)`);
    expect(body).toContain(`${SITE}/es/new-releases)`);
  });

  it('при отказе API не повторяет подсчёт на каждый запрос', async () => {
    getBookCards.mockRejectedValue(new Error('429'));
    const get = await loadGet();
    await Promise.all([get(), get()]);
    await get();
    expect(getBookCards).toHaveBeenCalledTimes(SUPPORTED_LANGS.length * 3);
  });

  it('не ждёт зависший API дольше срока и оставляет ссылки на лендинги', async () => {
    vi.useFakeTimers();
    try {
      getBookCards.mockImplementation(() => new Promise(() => {}));
      const pending = GET();
      await vi.advanceTimersByTimeAsync(3000);
      const body = await (await pending).text();
      expect(body).toContain(`${SITE}/fr/audiobooks)`);
    } finally {
      vi.useRealTimers();
    }
  });

  /** Обратная сторона: снятый хаб, оставшийся в списке, отправил бы агентов на 404. */
  it('ведёт только на существующие разделы `app/[lang]/`', () => {
    for (const hub of LLMS_HUBS) {
      expect(existsSync(join(process.cwd(), 'app', '[lang]', hub.path.slice(1), 'page.tsx'))).toBe(
        true
      );
    }
  });

  it('не публикует ничего из закрытого в robots.txt', async () => {
    const closed = robotsLists()
      .disallow.map((rule) => /^\/(?:\*\/)?([a-z-]+)\/?$/.exec(rule)?.[1])
      .filter((seg): seg is string => !!seg);
    expect(closed).toEqual(
      expect.arrayContaining(['auth', 'profile', 'bookshelf', 'admin', 'api'])
    );
    const links = [...(await (await GET()).text()).matchAll(/\]\(([^)]+)\)/g)].map(
      (m) => new URL(m[1]).pathname
    );
    for (const path of links) {
      const segments = path.split('/').filter(Boolean);
      for (const seg of closed) {
        expect(segments).not.toContain(seg);
      }
    }
  });
});
