// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { describe, expect, it, onTestFinished } from 'vitest';

/**
 * LEGACY-465 (решение арбитра 12.10.2026, ревью круг 1). Загрузки идут через серверный прокси,
 * а Node по умолчанию обрывает приём запроса через 300 с (`requestTimeout`). Модуль
 * `server-timeouts.cjs` подключается до `server.js` и поднимает потолок каждому серверу;
 * `headersTimeout` остаётся прежним — защита от медленных запросов не снимается.
 */

const REPO_ROOT = resolve(__dirname, '../..');
const requireFromRoot = createRequire(join(REPO_ROOT, 'package.json'));

describe('server-timeouts.cjs', () => {
  it('gives every created server a finite request timeout of an hour', () => {
    const http = requireFromRoot('node:http') as typeof import('node:http');
    const original = http.createServer;
    onTestFinished(() => {
      http.createServer = original;
    });
    const before = original();
    expect(before.requestTimeout).toBe(300_000);

    const { REQUEST_TIMEOUT_MS } = requireFromRoot('./server-timeouts.cjs') as {
      REQUEST_TIMEOUT_MS: number;
    };
    const server = http.createServer();

    expect(REQUEST_TIMEOUT_MS).toBe(3_600_000);
    expect(server.requestTimeout).toBe(REQUEST_TIMEOUT_MS);
    expect(server.headersTimeout).toBe(before.headersTimeout);
  });

  it('is preloaded by the runner command before server.js', () => {
    const dockerfile = readFileSync(join(REPO_ROOT, 'Dockerfile'), 'utf8');
    const runner = dockerfile.slice(dockerfile.indexOf('AS runner'));

    expect(runner).toContain('/app/server-timeouts.cjs ./server-timeouts.cjs');
    // Ключом в CMD, а не NODE_OPTIONS: переменная из env_file заменила бы `--require` молча.
    expect(runner).toContain('CMD ["node", "--require", "/app/server-timeouts.cjs", "server.js"]');
    expect(runner).not.toMatch(/^ENV NODE_OPTIONS/m);
  });

  it('is not cut out of the build context', () => {
    const ignored = readFileSync(join(REPO_ROOT, '.dockerignore'), 'utf8')
      .split('\n')
      .map((line) => line.trim());
    expect(ignored).not.toContain('server-timeouts.cjs');
    expect(ignored).not.toContain('*.cjs');
  });
});
