// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Сторож усиления конвейера фронта (`LEGACY-458`).
 *
 * Репозиторий публичный, а ключ деплоя даёт root на боевой машине (`LEGACY-464`), поэтому:
 * actions закреплены полным SHA (тег можно переставить), права токена по умолчанию -
 * только чтение, токен GHCR не лежит в тексте команды (виден в `ps` и в отладочном выводе),
 * ключ хоста берётся из `DEPLOY_KNOWN_HOSTS`, когда переменная заведена.
 *
 * ⚠️ Разбор текстовый: `yaml` прямой зависимостью не объявлен (п.4 `CLAUDE.md`). Комментарии
 * срезаются: шапки файлов цитируют проверяемые литералы.
 */
const WORKFLOWS_DIR = resolve(__dirname, '..', '.github', 'workflows');
const FILES = readdirSync(WORKFLOWS_DIR).filter((name) => name.endsWith('.yml'));

const read = (file: string): string => readFileSync(resolve(WORKFLOWS_DIR, file), 'utf8');
const code = (file: string): string =>
  read(file)
    .split(/\r?\n/)
    .filter((line) => !/^\s*#/.test(line))
    .join('\n');

describe('конвейер фронта: усиление (LEGACY-458)', () => {
  it('воркфлоу найдены', () => {
    expect(FILES).toEqual(expect.arrayContaining(['ci.yml', 'deploy.yml', 'seo-audit.yml']));
  });

  it.each(FILES)('%s: каждый action закреплён полным SHA с версией в комментарии', (file) => {
    const uses = read(file)
      .split(/\r?\n/)
      .filter((line) => /^\s*(-\s+)?uses:\s/.test(line));
    expect(uses.length).toBeGreaterThan(0);
    for (const line of uses) {
      expect(line).toMatch(/uses:\s+[\w.-]+\/[\w./-]+@[0-9a-f]{40}\s+#\s+v\d/);
    }
  });

  // Один action - один SHA во всех файлах: иначе `ci_gate` пропустит выкат по прогону,
  // собранному другой версией action. Та же проверка - в `books` (`deploy-trigger.spec.ts`).
  it('один и тот же action закреплён одним SHA во всех воркфлоу', () => {
    const pins = new Map<string, Set<string>>();
    for (const file of FILES) {
      for (const m of read(file).matchAll(/uses:\s+([\w.-]+\/[\w./-]+)@([0-9a-f]{40})/g)) {
        pins.set(m[1], (pins.get(m[1]) ?? new Set<string>()).add(m[2]));
      }
    }
    expect(pins.size).toBeGreaterThan(0);
    for (const [action, shas] of pins) expect([action, shas.size]).toEqual([action, 1]);
  });

  it.each(FILES)('%s: права по умолчанию - только чтение', (file) => {
    const top = code(file).match(/^permissions:\n((?: {2}\S.*\n)+)/m);
    expect(top).not.toBeNull();
    expect(top?.[1].trim()).toBe('contents: read');
  });

  // Запись одна на все воркфлоу - `packages: write` у публикации образа. Новое право
  // на запись или `write-all` в любом job любого файла краснеет здесь.
  it.each(FILES)('%s: права на запись только у публикации образа', (file) => {
    const text = code(file);
    expect(/write-all|read-all/.test(text)).toBe(false);
    const writes = text
      .split('\n')
      .filter((line) => /^\s+[a-z-]+:\s*write\s*$/.test(line))
      .map((line) => line.trim());
    expect(writes).toEqual(file === 'deploy.yml' ? ['packages: write'] : []);
  });

  it('запись пакетов у build, чтение - у deploy, без id-token и attestations', () => {
    const deploy = code('deploy.yml');
    expect(deploy).toMatch(
      /\n {2}build:\n(?: {4}.*\n)*? {4}permissions:\n {6}contents: read\n {6}packages: write\n/
    );
    expect(deploy).toMatch(
      /environment: production\n\s+permissions:\n\s+contents: read\n\s+packages: read/
    );
    expect(deploy).not.toMatch(/id-token:|attestations:/);
  });

  // Токен в тексте команды ssh попадает в аргументы процесса (`ps`) и в отладочный вывод.
  // Значение подставляется в команду только формой `${GHCR_TOKEN}` внутри строки ssh,
  // поэтому такая форма запрещена во всём файле, а `$GHCR_TOKEN` встречается ровно раз -
  // в `printf` перед `| ssh`.
  it('токен GHCR идёт в stdin ssh, а не в текст команды', () => {
    const deploy = code('deploy.yml');
    expect(deploy).not.toContain('${GHCR_TOKEN}');
    expect(deploy.match(/\$GHCR_TOKEN\b/g)).toHaveLength(1);
    expect(deploy).toContain('printf \'%s\' "$GHCR_TOKEN" | ssh');
    expect(deploy.match(/docker login/g)).toHaveLength(1);
    expect(deploy).toContain("docker login ghcr.io -u '${GHCR_USER}' --password-stdin");
  });

  it('ключ хоста берётся из DEPLOY_KNOWN_HOSTS, ssh-keyscan - только запасной путь', () => {
    const deploy = code('deploy.yml');
    expect(deploy).toContain('KNOWN_HOSTS: ${{ vars.DEPLOY_KNOWN_HOSTS }}');
    expect(deploy.match(/ssh-keyscan -H/g)).toHaveLength(1);
    expect(deploy).not.toContain('StrictHostKeyChecking=no');
  });

  // Шаг исполняется bash на обоих входах: проверка по тексту пропускала бы неверную ветку
  // (`L-017`). `ssh-keyscan` подменяется функцией - сеть тесту не нужна.
  describe('шаг known_hosts на живом прогоне', () => {
    const script = (): string => {
      const lines = read('deploy.yml').split(/\r?\n/);
      const at = lines.findIndex((line) => line === '      - name: Add host to known_hosts');
      expect(at).toBeGreaterThan(-1);
      const run = lines.findIndex((line, i) => i > at && /^ {8}run: \|\s*$/.test(line));
      const body: string[] = [];
      for (const line of lines.slice(run + 1)) {
        if (line.trim() !== '' && !/^ {10}/.test(line)) break;
        body.push(line.slice(10));
      }
      return body.join('\n').split('${{ secrets.SSH_HOST }}').join('server.example');
    };

    const run = (knownHosts: string): { code: number | null; out: string; known: string } => {
      const home = mkdtempSync(join(tmpdir(), 'known-hosts-'));
      try {
        const shim = `ssh-keyscan() { echo "scanned $*"; }\n`;
        const res = spawnSync('bash', ['-e', '-c', shim + script()], {
          encoding: 'utf8',
          env: { ...process.env, HOME: home.replace(/\\/g, '/'), KNOWN_HOSTS: knownHosts },
        });
        return {
          code: res.status,
          out: `${res.stdout}${res.stderr}`,
          known: readFileSync(join(home, '.ssh', 'known_hosts'), 'utf8'),
        };
      } finally {
        rmSync(home, { recursive: true, force: true });
      }
    };

    it('переменная задана - пишется она, без `\\r`, ssh-keyscan не зовётся', () => {
      const res = run('host ssh-ed25519 AAAA\r\nhost2 ssh-ed25519 BBBB\r');
      expect(res.code).toBe(0);
      expect(res.known).toBe('host ssh-ed25519 AAAA\nhost2 ssh-ed25519 BBBB\n');
      expect(res.out).not.toContain('::warning::');
    });

    it('переменной нет - прежний ssh-keyscan и предупреждение', () => {
      const res = run('');
      expect(res.code).toBe(0);
      expect(res.known).toBe('scanned -H server.example\n');
      expect(res.out).toContain('::warning::DEPLOY_KNOWN_HOSTS is not set');
    });
  });
});
