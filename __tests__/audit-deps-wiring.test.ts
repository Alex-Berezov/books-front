// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Сторож LEGACY-450 для фронта: аудит зависимостей стоит в `yarn ci`, а `yarn ci` зовут и `ci.yml`,
 * и `deploy.yml` (выкат на push в `main`; без своего шага он не ждал бы аудита в `ci.yml`). Если шаг выпадет из `ci` или
 * workflow перестанет звать `yarn ci` без условий, аудит отрабатывает формально.
 *
 * Форму строк allowlist описывает одно место — `entryError` в `scripts/audit-deps.mjs`;
 * здесь она не повторяется, тест зовёт её через `--check-allowlist`.
 */

const ROOT = resolve(__dirname, '..');
const SCRIPT = join(ROOT, 'scripts', 'audit-deps.mjs');
const SELF_TEST_CASES = 20;

const read = (...parts: string[]): string => readFileSync(join(ROOT, ...parts), 'utf8');
const runScript = (...args: string[]) =>
  spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8' });

const advisoryRow = (id: string, severity: string): string =>
  JSON.stringify({
    type: 'auditAdvisory',
    data: { advisory: { github_advisory_id: id, severity, module_name: 'pkg' } },
  });
const SUMMARY = JSON.stringify({ type: 'auditSummary', data: {} });

describe('аудит зависимостей в конвейерах (LEGACY-450)', () => {
  const scripts = (JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts;

  it('скрипты объявлены, а `ci` зовёт self-test перед аудитом', () => {
    expect(scripts['audit:deps']).toBe('node scripts/audit-deps.mjs');
    expect(scripts['audit:deps:self-test']).toBe('node scripts/audit-deps.mjs --self-test');
    // Полный состав `ci` сторожит `lint-coverage.test.ts`; здесь — только порядок пары.
    const steps = scripts.ci.split('&&').map((step) => step.trim());
    const selfTest = steps.indexOf('yarn audit:deps:self-test');
    expect(selfTest).toBeGreaterThanOrEqual(0);
    expect(steps[selfTest + 1]).toBe('yarn audit:deps');
  });

  it.each(['ci.yml', 'deploy.yml'])('%s: `yarn ci` — отдельный шаг без смягчений', (file) => {
    const lines = read('.github', 'workflows', file).split(/\r?\n/);
    const at = lines.findIndex((line) => /^(- )?run: yarn ci$/.test(line.trim()));
    expect(at).toBeGreaterThanOrEqual(0);
    // Рядом с шагом нет условий и смягчений: ни в `- name`, ни в соседних ключах шага.
    let start = at;
    while (start > 0 && !/^\s*-\s/.test(lines[start])) start -= 1;
    let end = at + 1;
    while (end < lines.length && lines[end].trim() !== '' && !/^\s*-\s/.test(lines[end])) end += 1;
    const step = lines.slice(start, end).join('\n');
    expect(step).not.toMatch(/continue-on-error|if:|\|\|\s*true/);
    // Условие или смягчение на уровне задания глушит шаг так же, как на самом шаге.
    // Ключи задания могут стоять и после `steps:`, поэтому смотрится всё задание целиком.
    const isJobHeader = (line: string): boolean => /^ {2}[\w-]+:\s*$/.test(line);
    let job = start;
    while (job > 0 && !isJobHeader(lines[job])) job -= 1;
    let jobEnd = at + 1;
    while (jobEnd < lines.length && !isJobHeader(lines[jobEnd]) && !/^\S/.test(lines[jobEnd])) {
      jobEnd += 1;
    }
    const jobBody = lines.slice(job, jobEnd).filter((line) => !/^\s*#/.test(line));
    expect(jobBody.join('\n')).not.toMatch(/^ {4}(if|continue-on-error):/m);
  });

  describe('сам шаг на подложенном выводе yarn audit', () => {
    let dir: string;
    beforeAll(() => {
      dir = mkdtempSync(join(tmpdir(), 'audit-deps-'));
    });
    afterAll(() => rmSync(dir, { recursive: true, force: true }));

    const runOn = (name: string, output: string) => {
      const file = join(dir, name);
      writeFileSync(file, output);
      return runScript('--audit-output', file);
    };

    it('чистый аудит — пропуск', () => {
      const run = runOn('clean.jsonl', [advisoryRow('GHSA-mod', 'moderate'), SUMMARY].join('\n'));
      expect(run.status).toBe(0);
      expect(run.stdout).toMatch(/ok: high\/critical в рабочих зависимостях — 0/);
    });

    it('совет high вне allowlist — отказ с его id', () => {
      const run = runOn('high.jsonl', [advisoryRow('GHSA-test-high', 'high'), SUMMARY].join('\n'));
      expect(run.status).toBe(1);
      expect(run.stderr).toMatch(/GHSA-test-high \(high, pkg\): нет в allowlist/);
    });

    it('настоящий вывод yarn audit (урезанный): совет найден по id, moderate пропущен', () => {
      // Фикстура снята с `yarn audit --groups dependencies --json` 10.10.2026 и урезана по полям;
      // id совета заменён выдуманным, чтобы исход не зависел от живого allowlist и его сроков.
      // Если имена полей в выводе разойдутся с разбором, шаг увидит ноль советов и станет зелёным.
      const sample = read('__tests__', 'fixtures', 'yarn-audit-sample.jsonl');
      const run = runOn('real.jsonl', sample);
      expect(run.status).toBe(1);
      expect(run.stderr).toMatch(/GHSA-real-shape-test \(critical, next\): нет в allowlist/);
      // moderate из той же фикстуры в отказ не попадает.
      expect(run.stderr.match(/нет в allowlist/g)).toHaveLength(1);
    });

    it('вывод без итога (сбой реестра) — отказ, а не «чисто»', () => {
      const run = runOn('broken.jsonl', 'error An unexpected error occurred: "ETIMEDOUT".');
      expect(run.status).toBe(1);
      expect(run.stderr).toMatch(/аудит не дошёл до итога/);
    });
  });

  it('self-test проходит и не потерял кейсы', () => {
    const run = runScript('--self-test');
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
    const count = Number(/self-test ok \((\d+) проверок\)/.exec(run.stdout)?.[1]);
    expect(count).toBeGreaterThanOrEqual(SELF_TEST_CASES);
  });

  it('строки allowlist по форме принимает сам скрипт', () => {
    const run = runScript('--check-allowlist');
    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
  });
});
