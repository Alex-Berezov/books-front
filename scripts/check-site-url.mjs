#!/usr/bin/env node
/**
 * Build guard for the public site origin and for the media host URLs.
 *
 * Two subjects, both of them build-time env values that nothing else validates.
 *
 * 1. `NEXT_PUBLIC_SITE_URL` feeds canonical, hreflang, og:url, JSON-LD and the
 *    sitemap. `NEXT_PUBLIC_API_BASE_URL` feeds data fetching. Mixing the two put
 *    `https://api.bibliaris.com/{lang}/tag/{slug}` into the public markup and got
 *    56 non-existent URLs discovered by Google in July 2026
 *    (books-app-docs/tasks/tz-seo-subdomain-leak.md).
 *
 * 2. `NEXT_PUBLIC_MEDIA_CDN_URL` / `NEXT_PUBLIC_UPLOADS_BASE_URL` feed the media
 *    entry of `images.remotePatterns` (LEGACY-280). `next.config.js` drops a value
 *    it cannot parse and says nothing, so a bare domain without a scheme - the most
 *    likely typo, and exactly how `.env.example` labels the variable - leaves a green
 *    build with the CDN not wired in at all.
 *
 * Why here and not in `check-env.mjs`, which the record proposed: that one runs under
 * `yarn ci`, and the `Quality gates` step of `ci.yml` carries no `env:` block while the
 * image build never calls `yarn ci` at all. `prebuild` is the single point the production
 * value from `vars.*` passes through before the deploy (`Dockerfile` -> `RUN yarn build`).
 * Arbiter decision of 28.08.2026, `books-app-docs/ai-context/decisions-log.md`.
 *
 * Run: `node scripts/check-site-url.mjs` (wired into `prebuild`).
 * Exits non-zero — and therefore fails the build — when the site URL is missing or
 * points at a service host, or when a media URL is set to something unparseable.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

/** Host prefixes that can never serve public HTML pages. */
const SERVICE_HOST_PREFIXES = ['api.', 'media.', 'cdn.', 'static.', 'assets.'];

/** Next.js loads these itself; a prebuild script has to read them manually. */
const ENV_FILES = ['.env.production.local', '.env.local', '.env.production', '.env'];

const parseEnvFile = (path) => {
  const result = {};
  if (!existsSync(path)) return result;
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip surrounding quotes and a trailing inline comment
    value = value.replace(/^["']|["']$/g, '').replace(/\s+#.*$/, '');
    result[key] = value;
  }
  return result;
};

const fileEnv = {};
for (const name of ENV_FILES) {
  const parsed = parseEnvFile(join(ROOT, name));
  for (const [key, value] of Object.entries(parsed)) {
    if (fileEnv[key] === undefined) fileEnv[key] = value;
  }
}

const readEnv = (name) => {
  const fromProcess = process.env[name];
  if (fromProcess !== undefined && fromProcess !== '') return fromProcess.trim();
  const fromFile = fileEnv[name];
  return fromFile !== undefined && fromFile !== '' ? fromFile.trim() : undefined;
};

const fail = (message) => {
  console.error(`✖ ${message}\n`);
  process.exit(1);
};

const siteUrl = readEnv('NEXT_PUBLIC_SITE_URL');
const apiBaseUrl = readEnv('NEXT_PUBLIC_API_BASE_URL');

if (!siteUrl) {
  fail(
    'NEXT_PUBLIC_SITE_URL is not set.\n' +
      '  It is the public site origin used for canonical, hreflang, og:url, JSON-LD and sitemap.\n' +
      '  Set it in .env.local (dev) or as a build arg / GitHub Actions variable (prod).'
  );
}

let parsed;
try {
  parsed = new URL(siteUrl);
} catch {
  fail(`NEXT_PUBLIC_SITE_URL is not a valid absolute URL: "${siteUrl}"`);
}

if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
  fail(`NEXT_PUBLIC_SITE_URL must use http(s), got "${parsed.protocol}"`);
}

const host = parsed.hostname.toLowerCase();
const badPrefix = SERVICE_HOST_PREFIXES.find((prefix) => host.startsWith(prefix));
if (badPrefix) {
  fail(
    `NEXT_PUBLIC_SITE_URL="${siteUrl}" points at the service host "${host}".\n` +
      '  Public page URLs must use the site domain. Use NEXT_PUBLIC_API_BASE_URL for API calls.'
  );
}

if (apiBaseUrl) {
  let apiHost;
  try {
    apiHost = new URL(apiBaseUrl).host;
  } catch {
    apiHost = undefined;
  }
  if (apiHost && apiHost === parsed.host) {
    fail(
      `NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_API_BASE_URL resolve to the same host "${apiHost}".\n` +
        '  They must be different origins: pages vs API.'
    );
  }
}

/**
 * Media host URLs.
 *
 * `next.config.js:7-8` reads `NEXT_PUBLIC_MEDIA_CDN_URL || NEXT_PUBLIC_UPLOADS_BASE_URL` —
 * the FIRST non-empty of the two, never both. This check repeats that priority instead of
 * treating the pair as equals: failing the build over a value the config does not read
 * would stop a build for a reason that is not there. The shadowed variable is still
 * reported, just not fatally.
 *
 * Absent or empty is a legitimate state and stays non-fatal — `next.config.js` then falls
 * back to the static `media.bibliaris.com` entry, and local builds have neither variable.
 * What is not legitimate is a value that was set and cannot be used: somebody meant to wire
 * a CDN in and did not.
 *
 * Every branch prints a line, including the do-nothing one. A guard whose success line
 * covers only the other subject reads as "checked and fine" when it means "there was
 * nothing to check" — that is the same silence LEGACY-280 was opened over, one floor up,
 * and it is what `check-langs-sync.mjs` avoids with its own `SKIPPED:` (LEGACY-156).
 *
 * A wildcard in the hostname IS refused here, even though `next.config.js:29-37` refuses it
 * too (LEGACY-137/LEGACY-279): `prebuild` runs before the config is ever loaded, so without
 * this branch the only thing the operator would see is this guard's own "add the host to the
 * predicate" advice — pointing straight back at LEGACY-137.
 */
const MEDIA_URL_VARS = ['NEXT_PUBLIC_MEDIA_CDN_URL', 'NEXT_PUBLIC_UPLOADS_BASE_URL'];

/**
 * The value as `next.config.js:8` sees it — `readEnv` without the trim.
 *
 * The difference matters for exactly one input and it is the one this guard cares about:
 * a whitespace-only value is falsy to `readEnv` and truthy to `||`, so the config picks
 * that variable, fails to parse it and drops the media entry. Deciding "which variable is
 * in play" on the trimmed value would name the other one and report the wrong state.
 */
const rawEnv = (name) => {
  const fromProcess = process.env[name];
  if (fromProcess !== undefined && fromProcess !== '') return fromProcess;
  const fromFile = fileEnv[name];
  return fromFile !== undefined && fromFile !== '' ? fromFile : undefined;
};

/** Same order as next.config.js: the first non-empty one is the only one it reads. */
const effectiveMediaVar = MEDIA_URL_VARS.find((name) => rawEnv(name) !== undefined);

const PREDICATE_FILE = 'lib/utils/image-host.ts';

/**
 * The hosts `isOptimizableHost` accepts, read out of the predicate as text.
 *
 * 🔴 There is a THIRD source of hosts besides the two static entries and this list: the
 * value of the media variable, which `next.config.js:75` turns into a `remotePatterns`
 * entry of its own. Point the variable at a new CDN and the optimizer accepts that host
 * while the predicate does not — every cover, portrait and avatar on the site goes out
 * `unoptimized`, original bytes with no AVIF/WebP and no resizing, and nothing says so:
 * `__tests__/next.config.test.ts` compares the two lists with the variables unset, on
 * purpose, so it cannot see this at all (LEGACY-279, "moving the CDN is three places").
 *
 * The predicate does NOT read the variable itself, and must not. `NEXT_PUBLIC_*` is baked
 * into the bundle at `next build`; so, under `output: 'standalone'`, is the config — the
 * whole `remotePatterns` array sits as a literal in `.next/standalone/server.js`, verified
 * 28.08.2026. Changing the variable in the container's environment therefore moves neither
 * of them, and a predicate reading it at build time would only add a second value to keep
 * in step with the first. Which also means: moving the CDN is a rebuild, never an env edit
 * on the running container — and this guard is the point that rebuild passes through.
 * Arbiter decision of 28.08.2026, `decisions-log.md`.
 *
 * Text, not import: this is a `.mjs` build guard and the predicate is TypeScript.
 * An unreadable list is a refusal, never a skip — a guard that quietly passes when it
 * could not read its own input is the defect it was written against (L-015).
 */
const readPredicateHosts = () => {
  const path = join(ROOT, PREDICATE_FILE);
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    fail(
      `${PREDICATE_FILE} could not be read, so the media host cannot be verified against it.`
    );
  }

  const match = text.match(/OPTIMIZABLE_HTTPS_HOSTS\s*=\s*\[([^\]]*)\]/);
  if (!match) {
    fail(
      [
        `OPTIMIZABLE_HTTPS_HOSTS was not found in ${PREDICATE_FILE}.`,
        '  This guard reads that list as text; renaming or reshaping it silently disables',
        '  the media-host check, so it refuses instead.',
      ].join('\n')
    );
  }

  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
};

for (const name of MEDIA_URL_VARS) {
  const value = readEnv(name);

  // ⚠️ `readEnv` обрезает пробелы и считает `"   "` незаданным, а `next.config.js:8`
  // берёт значение как есть: строка из пробелов для него истинна, он её выбирает,
  // роняет на `new URL` и молча отбрасывает. Промолчать здесь значило бы напечатать
  // «переменная не задана» про сборку, в которой она задана и испорчена — то есть
  // соврать в единственной строке, ради которой этот блок и печатается.
  const isEffective = name === effectiveMediaVar;

  if (!value) {
    // Оба источника, а не один: значение приезжает и из окружения, и из `.env`-файлов,
    // а Next при своей загрузке `.env` кавычки сохраняет — `NEXT_PUBLIC_MEDIA_CDN_URL="   "`
    // доезжает до конфига непустой строкой. Проверять только `process.env` значило бы
    // закрыть эту дыру ровно наполовину.
    const raw = rawEnv(name);
    if (raw && !raw.trim()) {
      const reason = `${name} is set to whitespace only.`;

      if (isEffective) {
        fail(
          [
            reason,
            '  next.config.js takes it as a value, fails to parse it and drops the media entry',
            '  without a word. Either give it a URL or unset it.',
          ].join('\n')
        );
      }

      // Затенённую не роняем — по тому же правилу, что и непарсящуюся ниже: конфиг её
      // не читает, и отказ остановил бы сборку по причине, которой в ней нет.
      console.warn(
        `⚠ ${reason} next.config.js does not read it while ${effectiveMediaVar} is set.`
      );
    }
    continue;
  }

  let mediaUrl;
  try {
    mediaUrl = new URL(value);
  } catch {
    const reason = [
      `${name}="${value}" is set but is not a valid absolute URL.`,
      '  Include the scheme: https://media.example.com, not media.example.com.',
    ];

    if (isEffective) {
      reason.splice(
        1,
        0,
        '  It feeds images.remotePatterns in next.config.js, which drops an unparseable',
        '  value silently — the build stays green and the CDN is not wired in at all.'
      );
      fail(reason.join('\n'));
    }

    // Не роняем: `next.config.js` эту переменную не читает, пока задана предыдущая.
    // Но и не молчим — значение всё равно негодное, и починить его надо.
    console.warn(
      [
        `⚠ ${reason[0]}`,
        `  next.config.js does not read it while ${effectiveMediaVar} is set, so the build goes on.`,
        reason[1],
      ].join('\n')
    );
    continue;
  }

  if (mediaUrl.protocol !== 'http:' && mediaUrl.protocol !== 'https:') {
    const reason = `${name}="${value}" must use http(s), got "${mediaUrl.protocol}"`;
    if (isEffective) fail(reason);
    console.warn(`⚠ ${reason} (not read while ${effectiveMediaVar} is set)`);
    continue;
  }

  if (!isEffective) {
    console.log(`· ${name} = ${value} (set, but shadowed by ${effectiveMediaVar})`);
    continue;
  }

  // Правило повторяется целиком, схемой и хостом, а не одним хостом: предикат решает
  // по паре. `http://media.bibliaris.com` — хост в списке, а `isOptimizableHost` даёт
  // `false`, потому что по `http` он пропускает только `localhost`. Половина правила
  // здесь пропустила бы ровно тот разъезд, ради которого проверка и написана, да ещё
  // и с советом «допиши хост», который в этом случае не помогает.
  //
  // `http://localhost` проходит: локальная сборка по `.env.example`
  // (`http://localhost:8787`) обязана работать, и в конфиге он стоит статической записью.
  const predicateHosts = readPredicateHosts();
  const knownToPredicate =
    (mediaUrl.protocol === 'http:' && mediaUrl.hostname === 'localhost') ||
    (mediaUrl.protocol === 'https:' && predicateHosts.includes(mediaUrl.hostname));

  if (!knownToPredicate) {
    const origin = `${mediaUrl.protocol}//${mediaUrl.hostname}`;

    // 🔴 Подстановка в имени хоста разбирается `new URL` без отказа, и совет «допиши хост
    // в предикат» увёл бы прямо в LEGACY-137. `next.config.js:29-37` откажет по имени,
    // но до него дело не дойдёт: `prebuild` идёт ДО загрузки конфига.
    if (mediaUrl.hostname.includes('*')) {
      fail(
        [
          `${name}="${value}" carries a wildcard host ("${mediaUrl.hostname}").`,
          '  It turns /_next/image into an open image proxy — LEGACY-137. Name the exact host.',
        ].join('\n')
      );
    }

    // Разработческий адрес по http отказом не считается: `http://127.0.0.1:8787`,
    // имя сервиса докера вроде `http://minio:9000`, MinIO на соседней машине
    // `http://192.168.1.50:9000` — рабочие локальные значения. Предикат их не примет,
    // картинки уйдут оригиналами, и это ровно то, чего от локальной сборки и ждут.
    // Ронять её здесь значило бы не оставить разработчику выхода: в список предиката
    // такой хост не допишешь — от этого краснеет сверка множеств
    // в `__tests__/next.config.test.ts:208`.
    //
    // Послабление не открывает дыру в проде, хотя отличить прод-сборку от локальной здесь
    // нечем: каждый адрес из этого набора не разрешается из браузера читателя вовсе.
    // Попади он в боевую переменную — картинки не «потеряют оптимизацию молча», а не
    // загрузятся ни у кого и сразу. Молчаливый отказ, ради которого написан этот блок,
    // бывает только на публично разрешимом хосте, и такой сюда не попадает.
    const host = mediaUrl.hostname;
    const isPrivateIpv4 = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
    const isDevAddress =
      mediaUrl.protocol === 'http:' &&
      (['::1', '[::1]', 'host.docker.internal'].includes(host) ||
        isPrivateIpv4 ||
        host.endsWith('.localhost') ||
        // Одна метка без точки — имя сервиса в docker-сети (`minio`, `uploads`).
        !host.includes('.'));

    if (isDevAddress) {
      console.warn(
        `⚠ ${name}="${value}" is a local http address: images will render unoptimized. ` +
          'Fine for a dev build, not a value for production.'
      );
      continue;
    }

    fail(
      [
        `${name}="${value}" points at ${origin}, which isOptimizableHost does not accept.`,
        '  next.config.js opens the optimizer for that host, the predicate does not, and',
        '  every image on the site would silently go out unoptimized — originals, no AVIF/WebP,',
        '  no resizing. No test sees this: the list comparison runs with the variables unset.',
        mediaUrl.protocol === 'https:'
          ? [
              `  Wiring "${mediaUrl.hostname}" in is TWO places, not one — __tests__/next.config.test.ts`,
              '  asserts the predicate list and the static https entries of next.config.js are equal,',
              '  so adding it to only one of them turns a red build into a red test suite:',
              `    1. OPTIMIZABLE_HTTPS_HOSTS in ${PREDICATE_FILE};`,
              '    2. a static remotePatterns entry in next.config.js (protected file — needs a line',
              '       in D:/newDev/.claude/unlock.txt).',
            ].join('\n')
          : `  Outside localhost the predicate accepts https only — use https://${mediaUrl.hostname}.`,
      ].join('\n')
    );
  }

  console.log(`✓ ${name} = ${value} (media host of images.remotePatterns, known to the predicate)`);
}

if (!effectiveMediaVar) {
  console.log(
    `· neither ${MEDIA_URL_VARS.join(' nor ')} is set — ` +
      'images.remotePatterns keeps only its static media.bibliaris.com entry'
  );
}

console.log(`✓ NEXT_PUBLIC_SITE_URL = ${siteUrl} (public origin, not a service host)`);
