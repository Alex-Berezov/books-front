import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isOptimizableHost, OPTIMIZABLE_HTTPS_HOSTS } from '@/components/public/authors/AuthorCard';

/**
 * 🔴 LEGACY-137. В `images.remotePatterns` лежала запись `{ protocol: 'https',
 * hostname: '**.com' }`, заведённая 15.11.2025 «для тестовых окружений». Она
 * разрешала маршруту `/_next/image` оптимизировать картинку с ЛЮБОГО домена
 * зоны `.com`: чужой трафик и чужой контент отдавались с нашего домена, а кэш
 * Next заполнялся чужим содержимым.
 *
 * Дефект не ловится ничем, кроме такой проверки: `next.config.js` — обычный
 * объект без схемы, и для типов Next подстановка `**.com` так же законна, как
 * точное имя хоста.
 */

interface RemotePattern {
  protocol?: string;
  hostname: string;
  pathname?: string;
  port?: string;
}

async function loadRemotePatterns(): Promise<RemotePattern[]> {
  // Конфиг считает `mediaCdnHostname` один раз, при загрузке модуля. Без сброса
  // кэша подстановка переменных ниже ничего бы не изменила.
  vi.resetModules();
  const config = (await import('../next.config.js')).default;
  return config.images.remotePatterns as RemotePattern[];
}

/**
 * Статические `https`-записи конфига: условная запись из переменной окружения
 * и `http://localhost` в сверку не входят — первая зависит от окружения, вторая
 * разбирается предикатом отдельной веткой.
 */
async function staticHttpsHosts(): Promise<string[]> {
  const hostnames = (await loadRemotePatterns())
    .filter((p) => p.protocol === 'https' && !p.hostname.includes('*'))
    .map((p) => p.hostname);
  // Повтор — законное состояние: `media.bibliaris.com` стоит и статической записью,
  // и приезжает из `NEXT_PUBLIC_MEDIA_CDN_URL`. Дубль безвреден (`hasRemoteMatch`
  // идёт `.some()`), но сверку множеств он ронял бы на ровном месте.
  return [...new Set(hostnames)];
}

const OWN_DOMAIN = 'bibliaris.com';

/**
 * Подстановка в имени хоста допустима только внутри нашего собственного домена.
 *
 * Считать метки после звёздочки недостаточно: `**.co.uk`, `**.com.br`, `**.pages.dev`,
 * `**.r2.dev` — это тот же открытый прокси, только на другой публичный суффикс, а хост
 * в такой зоне заводит кто угодно. Списка публичных суффиксов в проекте нет и заводить
 * его ради одной проверки не стоит, поэтому правило обратное: своё разрешено, остальное нет.
 */
function wildcardIsOwnDomainOnly(hostname: string): boolean {
  if (!hostname.includes('*')) return true;
  const rest = hostname.replace(/^\*+\./, '');
  return rest === OWN_DOMAIN || rest.endsWith(`.${OWN_DOMAIN}`);
}

describe('wildcardIsOwnDomainOnly', () => {
  /**
   * Правило проверяется на образцах отдельно от конфига: в самом конфиге
   * подстановок сейчас нет вовсе, и проверка по нему одному была бы холостой —
   * зелёной независимо от того, работает правило или нет.
   */
  it('rejects a wildcard that covers a whole top-level zone', () => {
    expect(wildcardIsOwnDomainOnly('**.com')).toBe(false);
    expect(wildcardIsOwnDomainOnly('*.com')).toBe(false);
    expect(wildcardIsOwnDomainOnly('**.org')).toBe(false);
  });

  it('rejects a wildcard over a public suffix with more than one label', () => {
    // Ровно та же дыра, что `**.com`, только зона длиннее: хост в ней заводит кто угодно.
    expect(wildcardIsOwnDomainOnly('**.co.uk')).toBe(false);
    expect(wildcardIsOwnDomainOnly('**.com.br')).toBe(false);
    expect(wildcardIsOwnDomainOnly('**.pages.dev')).toBe(false);
    expect(wildcardIsOwnDomainOnly('**.r2.dev')).toBe(false);
  });

  it('rejects a wildcard over a registrable domain that is not ours', () => {
    expect(wildcardIsOwnDomainOnly('**.googleusercontent.com')).toBe(false);
    expect(wildcardIsOwnDomainOnly('**.bibliaris.com.attacker.com')).toBe(false);
  });

  it('accepts a wildcard inside our own domain', () => {
    expect(wildcardIsOwnDomainOnly('*.bibliaris.com')).toBe(true);
    expect(wildcardIsOwnDomainOnly('**.bibliaris.com')).toBe(true);
    expect(wildcardIsOwnDomainOnly('**.media.bibliaris.com')).toBe(true);
  });

  it('accepts a hostname without any wildcard', () => {
    expect(wildcardIsOwnDomainOnly('api.bibliaris.com')).toBe(true);
    expect(wildcardIsOwnDomainOnly('localhost')).toBe(true);
  });
});

describe('next.config.js: images.remotePatterns', () => {
  const MEDIA_ENV = ['NEXT_PUBLIC_MEDIA_CDN_URL', 'NEXT_PUBLIC_UPLOADS_BASE_URL'] as const;

  beforeEach(() => {
    // Убираем переменные, а не проверяем, что их нет: иначе тест зависел бы от
    // того, что экспортировано в шелле у запускающего, и падал бы по причине,
    // к этой записи отношения не имеющей.
    for (const name of MEDIA_ENV) vi.stubEnv(name, undefined as unknown as string);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('has no wildcard in the top-level domain part', async () => {
    for (const pattern of await loadRemotePatterns()) {
      expect(pattern.hostname).not.toMatch(/^\*{1,2}\.[a-z]{2,}$/i);
    }
  });

  it('allows a wildcard only inside our own domain', async () => {
    for (const pattern of await loadRemotePatterns()) {
      expect(wildcardIsOwnDomainOnly(pattern.hostname)).toBe(true);
    }
  });

  it('keeps both project hosts without any env var', async () => {
    const hostnames = (await loadRemotePatterns()).map((p) => p.hostname);
    for (const host of ['api.bibliaris.com', 'media.bibliaris.com']) {
      expect(hostnames).toContain(host);
    }
  });

  it('adds the media CDN host from the env var when it is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_MEDIA_CDN_URL', 'https://cdn.example.org');

    const hostnames = (await loadRemotePatterns()).map((p) => p.hostname);
    expect(hostnames).toContain('cdn.example.org');
  });

  it('survives the CDN host arriving twice — statically and from the env var', async () => {
    // Ровно то, что происходит в продовой сборке с 26.08.2026 (LEGACY-279):
    // переменная заведена тем же адресом, что стоит статической записью, и хост
    // попадает в `remotePatterns` дважды.
    // Хост назван строкой, а не взят индексом из чужого массива: переставят там
    // элементы — дубль возникнет на другом хосте, тест останется зелёным и будет
    // проверять уже не тот сценарий, что описан выше.
    const cdnHost = 'media.bibliaris.com';
    vi.stubEnv('NEXT_PUBLIC_MEDIA_CDN_URL', `https://${cdnHost}`);

    const hostnames = (await loadRemotePatterns()).map((p) => p.hostname);
    expect(hostnames.filter((h) => h === cdnHost)).toHaveLength(2);

    // Дубль безвреден для Next (`hasRemoteMatch` идёт `.some()`) и не должен ронять
    // сверку двух списков — иначе она краснела бы в продовой сборке на ровном месте.
    expect([...(await staticHttpsHosts())].sort()).toEqual([...OPTIMIZABLE_HTTPS_HOSTS].sort());
  });

  /**
   * 🔴 LEGACY-279. Протаскивание переменной через сборку само открыло возврат
   * LEGACY-137: значение живёт в настройках репозитория, а не в коде, — его не видит
   * ни ревьюер, ни замок перед коммитом. Остальные проверки этого файла его тоже
   * не поймают: они читают конфиг при СНЯТЫХ переменных, чтобы не зависеть
   * от машины прогона. Значит подстановку надо ловить там, где она появляется, —
   * при чтении переменной, отказом сборки.
   *
   * Зависимости от машины здесь нет: значение задаёт сам тест.
   */
  for (const envName of ['NEXT_PUBLIC_MEDIA_CDN_URL', 'NEXT_PUBLIC_UPLOADS_BASE_URL'] as const) {
    it(`refuses to build when ${envName} carries a wildcard host`, async () => {
      vi.stubEnv(envName, 'https://**.example.test');

      // Сообщение обязано назвать ИМЕННО ту переменную, откуда пришло значение:
      // иначе оператор при красной сборке идёт проверять обе, а проверка регуляркой
      // проходит при любой и потому ничего не значит.
      const other =
        envName === 'NEXT_PUBLIC_MEDIA_CDN_URL'
          ? 'NEXT_PUBLIC_UPLOADS_BASE_URL'
          : 'NEXT_PUBLIC_MEDIA_CDN_URL';
      await expect(loadRemotePatterns()).rejects.toThrow(new RegExp(envName));
      await expect(loadRemotePatterns()).rejects.not.toThrow(new RegExp(other));
    });

    it(`refuses the exact pattern LEGACY-137 removed, via ${envName}`, async () => {
      vi.stubEnv(envName, 'https://**.com');
      await expect(loadRemotePatterns()).rejects.toThrow(/LEGACY-137/);
    });
  }

  it('takes the protocol of the env var instead of assuming https', async () => {
    // `.env.example` предлагает для этой переменной `http://...`; запись с жёстким
    // `https` не совпала бы с таким адресом ни разу, и это было бы молча.
    // Хост нарочно не `localhost`: тот уже стоит в конфиге статической записью
    // по `http`, и проверка прошла бы, даже если схема нигде не разбирается.
    vi.stubEnv('NEXT_PUBLIC_UPLOADS_BASE_URL', 'http://uploads.example.test:8787');

    const entry = (await loadRemotePatterns()).find((p) => p.hostname === 'uploads.example.test');
    expect(entry).toBeDefined();
    expect(entry?.protocol).toBe('http');
  });

  /**
   * `isOptimizableHost` (`components/public/authors/AuthorCard.tsx`) — второй,
   * написанный руками список тех же хостов: он решает, ставить ли `unoptimized`
   * там, где `onError` не поставить. Разъедутся молча — оптимизатор ответит 400,
   * и фото не появится вовсе. Поэтому списки сверяются, а не сопровождаются
   * комментарием «не забудь поправить оба».
   */
  it('holds exactly the same static hosts as the predicate, both ways', async () => {
    const fromConfig = [...(await staticHttpsHosts())].sort();
    const fromPredicate = [...OPTIMIZABLE_HTTPS_HOSTS].sort();

    // Равенство, а не вхождение. Хост, дописанный в предикат мимо конфига, —
    // опасная сторона: `/_next/image` ответит на него 400, компоненты серверные,
    // `onError` подставить некуда, и фото не появится вовсе.
    expect(fromPredicate).toEqual(fromConfig);
  });

  it('agrees with isOptimizableHost on every static host', async () => {
    for (const host of await staticHttpsHosts()) {
      expect(isOptimizableHost(`https://${host}/a.jpg`)).toBe(true);
    }
    expect(isOptimizableHost('https://example.com/a.jpg')).toBe(false);
    expect(isOptimizableHost('https://upload.wikimedia.org/a.jpg')).toBe(false);
  });
});
