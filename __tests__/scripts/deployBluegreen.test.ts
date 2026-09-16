// @vitest-environment node
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * Сторож переключения трафика в `scripts/deploy-bluegreen.sh` (`LEGACY-393`).
 *
 * 🔴 15.09.2026 выкат прошёл зелёным во всех шагах, а сайт лежал с 502 около сорока минут:
 * `caddy reload` завершился кодом 0, не применив конфиг, скрипт счёл переключение
 * состоявшимся и через `DRAIN_SECONDS` погасил контейнер, на который Caddy всё ещё смотрел.
 * Сравнение логов двух выкатов того дня показало, что применившийся и неприменившийся
 * reload дают побайтово одинаковый вывод и один и тот же код возврата — то есть отличить
 * их можно только со стороны загруженного конфига.
 *
 * Поэтому проверка здесь не текстовая, а исполняемая: скрипт правда запускается на
 * подставных `sudo`, `caddy`, `docker` и `curl`, которые моделируют ровно тот отказ.
 * Сторож по тексту («в файле есть слово curl») на этом дефекте был бы зелёным — он
 * ничего не говорит о порядке шагов, а сломан был именно порядок.
 *
 * Модель стендов:
 *   state/loaded_port      — порт, который Caddy держит В ПАМЯТИ (не то же, что файл upstream);
 *   state/port_<порт>_up   — контейнер на этом порту поднят;
 *   state/reload_plan      — по знаку на вызов reload: `1` применяет конфиг, `0` завершается
 *                            кодом 0, не применив; последний знак повторяется;
 *   state/admin_fail       — сколько ближайших запросов к admin API оборвутся;
 *   state/public_down      — публичная страница не отвечает, даже когда контейнер жив.
 */
const SCRIPT = resolve(__dirname, '..', '..', 'scripts', 'deploy-bluegreen.sh');

/** Трафик до выката стоит на 3002 (green); цель выката — 3001 (blue). */
const PREVIOUS_PORT = '3002';
const TARGET_PORT = '3001';

let root = '';
/** Сценарный флаг текущего кейса: на какой команде `caddy` завершается ненулём. */
let caddyFailsOnCurrent: Scenario['caddyFailsOn'];

const state = (name: string): string => join(root, 'state', name);

const writeStub = (name: string, body: string): void => {
  const file = join(root, 'bin', name);
  writeFileSync(file, `#!/usr/bin/env bash\n${body}\n`, 'utf8');
  chmodSync(file, 0o755);
};

type Scenario = {
  /**
   * План поведения `caddy reload`, по знаку на вызов: `1` — применяет конфиг,
   * `0` — возвращает 0 и не применяет (отказ 15.09.2026). Когда знаки кончились,
   * последний повторяется. `"1"` — всегда применяет, `"0"` — никогда,
   * `"01"` — первый молчком не применил, дальше работает, `"10"` — наоборот.
   */
  reloadPlan?: string;
  /**
   * `caddy` завершается ненулевым кодом на этой команде (`validate` или `reload`) —
   * то есть отказ самой команды, а не молчаливое неприменение конфига.
   */
  caddyFailsOn?: 'validate' | 'reload';
  /** Сколько первых запросов к admin API оборвутся (отказ `curl`, не пустой ответ). */
  adminFailures?: number;
  /** Публичная страница не отвечает, даже когда контейнер поднят. */
  publicDown?: boolean;
  /** Файла upstream до выката нет — откатывать некуда. */
  noUpstreamFile?: boolean;
};

const setUpStubs = ({
  reloadPlan = '1',
  caddyFailsOn,
  adminFailures = 0,
  publicDown = false,
  noUpstreamFile = false,
}: Scenario = {}): void => {
  mkdirSync(join(root, 'bin'), { recursive: true });
  mkdirSync(join(root, 'state'), { recursive: true });
  mkdirSync(join(root, 'compose'), { recursive: true });

  if (!noUpstreamFile) {
    writeFileSync(
      join(root, 'upstream.caddy'),
      `reverse_proxy 127.0.0.1:${PREVIOUS_PORT}\n`,
      'utf8'
    );
  }
  writeFileSync(join(root, 'Caddyfile'), 'import upstream.caddy\n', 'utf8');
  // Чистый сервер: ни upstream-файла, ни фронтового апстрима в загруженном конфиге,
  // ни прежнего контейнера. Оставить здесь порт означало бы проверять не первый запуск.
  writeFileSync(state('loaded_port'), noUpstreamFile ? '' : PREVIOUS_PORT, 'utf8');
  if (!noUpstreamFile) writeFileSync(state(`port_${PREVIOUS_PORT}_up`), '1', 'utf8');
  writeFileSync(state('reload_plan'), reloadPlan, 'utf8');
  writeFileSync(state('admin_fail'), String(adminFailures), 'utf8');
  if (publicDown) writeFileSync(state('public_down'), '1', 'utf8');
  caddyFailsOnCurrent = caddyFailsOn;

  // `sudo` прав не добавляет, а просто исполняет дальше: на сервере у деплой-пользователя
  // `(ALL) NOPASSWD: ALL`, то есть разницы в поведении команд он не создаёт.
  writeStub('sudo', 'exec "$@"');

  writeStub(
    'caddy',
    [
      'cmd="$1"',
      'if [ -n "${CADDY_FAILS_ON:-}" ] && [ "$cmd" = "$CADDY_FAILS_ON" ]; then',
      '  echo "caddy: команда $cmd завершилась ошибкой" >&2',
      '  exit 1',
      'fi',
      'if [ "$cmd" != "reload" ]; then exit 0; fi',
      'echo "{\\"msg\\":\\"adapted config to JSON\\"}"',
      'plan="$(cat "$STATE/reload_plan")"',
      'step="${plan%"${plan#?}"}"',
      'rest="${plan#?}"',
      'if [ -n "$rest" ]; then printf "%s" "$rest" > "$STATE/reload_plan"; fi',
      // Ровно тот отказ 15.09.2026: код 0, привычный вывод, конфиг не применён.
      'if [ "$step" = "0" ]; then exit 0; fi',
      'grep -oE "300[0-9]" "$UPSTREAM_FILE" | head -1 | tr -d "\\n" > "$STATE/loaded_port"',
      'exit 0',
    ].join('\n')
  );

  writeStub(
    'docker',
    [
      'printf "%s\\n" "$*" >> "$STATE/docker.log"',
      'if [ "$1" = "image" ]; then exit 0; fi',
      `port=${TARGET_PORT}`,
      `case "$*" in *green*) port=${PREVIOUS_PORT} ;; esac`,
      'case "$*" in',
      '  *" up "*) echo 1 > "$STATE/port_${port}_up" ;;',
      '  *" stop "*) rm -f "$STATE/port_${port}_up" ;;',
      'esac',
      'exit 0',
    ].join('\n')
  );

  writeStub(
    'curl',
    [
      'target=""',
      'for a in "$@"; do case "$a" in http*) target="$a" ;; esac; done',
      'case "$target" in',
      // Admin API: отдаёт ЗАГРУЖЕННЫЙ конфиг, а не содержимое upstream-файла.
      '  *:2019*)',
      '    left="$(cat "$STATE/admin_fail")"',
      '    if [ "$left" -gt 0 ]; then echo "$((left - 1))" > "$STATE/admin_fail"; exit 7; fi',
      '    printf "{\\"dial\\":\\"127.0.0.1:%s\\"}" "$(cat "$STATE/loaded_port")"',
      '    exit 0 ;;',
      // Готовность контейнера щупается напрямую по локальному порту, мимо Caddy.
      '  *127.0.0.1:*)',
      '    port="$(echo "$target" | grep -oE "300[0-9]")"',
      '    [ -f "$STATE/port_${port}_up" ] && exit 0 || exit 7 ;;',
      'esac',
      // Публичная страница: идёт через Caddy, то есть на тот порт, что загружен.
      'if [ -f "$STATE/public_down" ]; then exit 22; fi',
      'loaded="$(cat "$STATE/loaded_port")"',
      '[ -f "$STATE/port_${loaded}_up" ] && exit 0 || exit 22',
    ].join('\n')
  );
};

const runDeploy = (): { status: number | null; out: string } => {
  const result = spawnSync('bash', [SCRIPT], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${join(root, 'bin')}${delimiter}${process.env.PATH ?? ''}`,
      STATE: join(root, 'state'),
      COMPOSE_DIR: join(root, 'compose'),
      UPSTREAM_FILE: join(root, 'upstream.caddy'),
      CADDYFILE: join(root, 'Caddyfile'),
      CADDY_ADMIN_URL: 'http://stub-admin.invalid:2019',
      CADDY_FAILS_ON: caddyFailsOnCurrent ?? '',
      PUBLIC_URL: 'http://deploy-stub.invalid',
      READY_ATTEMPTS: '2',
      READY_INTERVAL: '0',
      VERIFY_ATTEMPTS: '3',
      VERIFY_INTERVAL: '0',
      DRAIN_SECONDS: '0',
    },
  });

  return { status: result.status, out: `${result.stdout ?? ''}${result.stderr ?? ''}` };
};

const dockerLog = (): string =>
  existsSync(state('docker.log')) ? readFileSync(state('docker.log'), 'utf8') : '';

/** Погашен ли прежний контейнер — тот самый шаг, который 15.09.2026 уронил сайт. */
const previousStopped = (): boolean => /stop frontend-green/.test(dockerLog());
const targetStopped = (): boolean => /stop frontend-blue/.test(dockerLog());
const loadedPort = (): string => readFileSync(state('loaded_port'), 'utf8').trim();

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'bluegreen-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('выкат фронта: переключение подтверждается загруженным конфигом Caddy', () => {
  it('reload применился — выкат доходит до конца и гасит прежний контейнер', () => {
    setUpStubs();

    const { status, out } = runDeploy();

    expect(status, out).toBe(0);
    expect(loadedPort()).toBe(TARGET_PORT);
    expect(previousStopped(), 'прежний контейнер должен гаситься после подтверждения').toBe(true);
  });

  /**
   * 🔴 Головной кейс записи. Верни скрипту прежнее поведение — гашение прежнего
   * контейнера сразу после `caddy reload` — и этот тест покраснеет: выкат отчитается
   * нулём, а снаружи останется 502.
   */
  it('reload молча не применился — выкат красный, прежний контейнер жив', () => {
    setUpStubs({ reloadPlan: '0' });

    const { status, out } = runDeploy();

    expect(status, out).not.toBe(0);
    expect(previousStopped(), 'прежний контейнер гасить нельзя: трафик всё ещё на нём').toBe(false);
    expect(loadedPort(), 'Caddy так и остался на прежнем порте').toBe(PREVIOUS_PORT);
    expect(readFileSync(join(root, 'upstream.caddy'), 'utf8')).toContain(PREVIOUS_PORT);
    expect(out).toContain('Traffic was NOT switched');
  });

  it('первый reload не применился, второй применился — выкат доходит до конца', () => {
    setUpStubs({ reloadPlan: '01' });

    const { status, out } = runDeploy();

    expect(status, out).toBe(0);
    expect(loadedPort()).toBe(TARGET_PORT);
    expect(previousStopped()).toBe(true);
  });

  /**
   * 🔴 Второй головной кейс: Caddy УЖЕ смотрит на новый порт, но снаружи сайт не отвечает,
   * а откатный reload молча не применяется. Гасить целевой контейнер в этот момент —
   * значит уронить сайт своими руками, повторив 15.09.2026 с другой стороны.
   */
  it('Caddy остался на целевом порте при неудачном откате — не гасить ни один контейнер', () => {
    setUpStubs({ publicDown: true, reloadPlan: '10' });

    const { status, out } = runDeploy();

    expect(status, out).not.toBe(0);
    expect(loadedPort(), 'откатный reload не применился — Caddy держит целевой порт').toBe(
      TARGET_PORT
    );
    expect(targetStopped(), 'целевой контейнер гасить нельзя: Caddy смотрит на него').toBe(false);
    expect(previousStopped(), 'прежний контейнер тоже не трогаем').toBe(false);
    expect(out).toContain('Оба контейнера живы');
  });

  /**
   * Нечитаемый admin API — это исход «я не проверила», а не успех (`L-015`).
   * Заодно кейс ловит обрыв скрипта по `set -e`: отказ `curl` обязан быть отказом
   * проверки, а не мгновенной смертью процесса мимо ветки отката.
   */
  it('admin API не отвечает — выкат красный, прежний контейнер жив', () => {
    setUpStubs({ adminFailures: Number.MAX_SAFE_INTEGER });

    const { status, out } = runDeploy();

    expect(status, out).not.toBe(0);
    expect(previousStopped()).toBe(false);
    expect(out).toContain('admin API не ответил');
  });

  /**
   * Тот же `set -e`, но в безобидном виде: admin API моргнул и ответил со второй
   * попытки. Обрыв скрипта здесь превратил бы исправный выкат в аварию.
   */
  it('admin API моргнул и ответил — выкат доходит до конца', () => {
    setUpStubs({ adminFailures: 2 });

    const { status, out } = runDeploy();

    expect(status, out).toBe(0);
    expect(loadedPort()).toBe(TARGET_PORT);
    expect(previousStopped()).toBe(true);
  });

  /**
   * Отказ самой команды `caddy` — не то же, что молчаливое неприменение конфига:
   * здесь ненулевой код возврата есть, и ветка `|| return 1` в `switch_upstream`
   * обязана увести в откат, а не оборвать скрипт с переписанным upstream-файлом.
   */
  it('caddy validate завершился ошибкой — откат, прежний контейнер жив', () => {
    setUpStubs({ caddyFailsOn: 'validate' });

    const { status, out } = runDeploy();

    expect(status, out).not.toBe(0);
    expect(previousStopped(), 'трафик всё ещё на прежнем контейнере').toBe(false);
    expect(loadedPort(), 'Caddy остался там, где был').toBe(PREVIOUS_PORT);
    expect(out).toContain('не удалось переключить upstream');
  });

  it('caddy reload завершился ошибкой — откат, прежний контейнер жив', () => {
    setUpStubs({ caddyFailsOn: 'reload' });

    const { status, out } = runDeploy();

    expect(status, out).not.toBe(0);
    expect(previousStopped()).toBe(false);
    expect(loadedPort()).toBe(PREVIOUS_PORT);
  });

  it('upstream-файла не было и переключение не удалось — откатывать некуда, выкат красный', () => {
    setUpStubs({ noUpstreamFile: true, reloadPlan: '0' });

    const { status, out } = runDeploy();

    expect(status, out).not.toBe(0);
    expect(out).toContain('Откатывать некуда');
    expect(previousStopped()).toBe(false);
  });
});
