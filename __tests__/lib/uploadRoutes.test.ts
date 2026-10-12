// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isUploadRoute, uploadRoutePattern } from '@/lib/upload-routes';

/**
 * LEGACY-465 (решения арбитра 12.10.2026, ревью круг 1). Серверный прокси несёт не-JSON тело
 * только на пути из `lib/upload-routes.ts`, остальное — 415. Вызывающие загрузки держат путь
 * литералом (так требует `check:type-sync`), поэтому расхождение списка с ними ловится здесь:
 * тест сам находит загрузки в `api/**` и прогоняет их пути через `isUploadRoute`.
 *
 * Три формы загрузки:
 * - `http(Post|Put|Patch)Auth(путь, <FormData>)` — тело `FormData` через http-клиент;
 * - `xhr.open(метод, backendProxyUrl(путь))` — XHR с прогрессом на адрес прокси;
 * - `xhr.open(target.method, proxyUrl ...)` — прямая загрузка по presign: путь называет ответ
 *   presign, у локального драйвера бэкенда это `/uploads/direct`
 *   (`books/src/modules/uploads/uploads.service.ts`).
 */

const REPO_ROOT = resolve(__dirname, '../..');
const API_DIR = join(REPO_ROOT, 'api');

/** Число загрузок на 12.10.2026: четыре `FormData`, многочастный XHR, прямая загрузка. */
const EXPECTED_UPLOAD_CALLS = 6;

const DIRECT_UPLOAD_PATH = '/uploads/direct';

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });

/** Литерал пути из исходника: строка или шаблон, где каждая подстановка — образец сегмента. */
const literalPath = (literal: string): string =>
  literal.slice(1, -1).replace(/\$\{[^}]+\}/g, 'sample-id');

interface UploadCall {
  where: string;
  path: string;
}

const FORM_DATA_CALL =
  /http(?:Post|Put|Patch)Auth<[^>]*>\(\s*(`[^`]*`|'[^']*')\s*,\s*(?:toFormData\(|\w*[fF]ormData\b)/g;
const PROXY_XHR = /xhr\.open\(\s*'[A-Z]+'\s*,\s*backendProxyUrl\(\s*(`[^`]*`|'[^']*')\s*\)/g;
const DIRECT_XHR = /xhr\.open\(\s*target\.method\s*,\s*proxyUrl\b/g;

const findUploadCalls = (): UploadCall[] =>
  sourceFiles(API_DIR).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    const where = relative(REPO_ROOT, file);
    return [
      ...[...source.matchAll(FORM_DATA_CALL)].map((m) => ({ where, path: literalPath(m[1]) })),
      ...[...source.matchAll(PROXY_XHR)].map((m) => ({ where, path: literalPath(m[1]) })),
      ...[...source.matchAll(DIRECT_XHR)].map(() => ({ where, path: DIRECT_UPLOAD_PATH })),
    ];
  });

describe('upload routes of the server proxy', () => {
  const calls = findUploadCalls();

  it('finds every upload in api/** — none found is a broken search, not a clean tree', () => {
    expect(calls.length, JSON.stringify(calls, null, 2)).toBe(EXPECTED_UPLOAD_CALLS);
  });

  it.each(findUploadCalls().map((call) => [`${call.where} → ${call.path}`, call.path]))(
    'the proxy takes the upload body of %s',
    (_name, path) => {
      expect(isUploadRoute(path)).toBe(true);
    }
  );

  it.each(['/users/me', '/comments', '/media/upload/extra', '/media', '/uploads/presign'])(
    'a non-upload path %s gets no streamed body',
    (path) => {
      expect(isUploadRoute(path)).toBe(false);
    }
  );

  it('a template character is literal: a dot does not match any character', () => {
    const pattern = uploadRoutePattern('/admin/rights/:id/report.pdf');
    expect(pattern.test('/admin/rights/r1/report.pdf')).toBe(true);
    expect(pattern.test('/admin/rights/r1/reportXpdf')).toBe(false);
  });

  it('a parameter matches one segment only', () => {
    expect(isUploadRoute('/admin/rights/profiles/p1/source-file')).toBe(true);
    expect(isUploadRoute('/admin/rights/profiles/a/b/source-file')).toBe(false);
  });
});
