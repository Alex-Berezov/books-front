/**
 * Чистая логика гейта type-sync. Ввод - тексты файлов и разобранный OpenAPI,
 * вывод - данные. Ни чтения диска, ни process.exit: всё это в check-type-sync.mjs.
 */

/** Плейсхолдер параметра пути: и в адресе вызова, и в пути OpenAPI после нормализации. */
export const PARAM = '{p}';

// Обобщённый параметр необязателен: ручки, отдающие void, его не пишут, а маршрут у них
// такой же настоящий. Требование `<Тип>` делало восемь вызовов невидимыми - в том числе
// вызов в маршрут, которого у бэкенда нет вовсе.
const CALL_RE = /http(Get|Post|Patch|Put|Delete)(?:Auth)?\s*(<)?/g;

/**
 * Закрывающая скобка обобщённого параметра со счётом вложенности `A<B<C>>`.
 * Точка с запятой обрывает разбор только вне фигурных скобок: внутри она разделяет
 * поля литерального типа `<{ key: string; url: string }>` - это по-прежнему параметр.
 */
function skipGeneric(src, from) {
  let depth = 1;
  let brace = 0;
  for (let i = from; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') brace++;
    else if (ch === '}') brace--;
    else if (ch === '<') depth++;
    else if (ch === '>') {
      depth--;
      if (depth === 0) return i;
    } else if (ch === ';' && brace === 0) return -1;
  }
  return -1;
}

/** Аргумент вызова целиком: со счётом скобок, чтобы `f(a, b)` внутри не обрывал разбор. */
export function readArgument(src, from) {
  let depth = 0;
  // Глубина подстановок `${...}` считается отдельно от скобок: общий счётчик не давал
  // закрыться шаблону внутри вызова - `f(a, `x${y}`)` дочитывался до конца файла.
  let tplDepth = 0;
  let i = from;
  let out = '';
  let quote = null;
  while (i < src.length) {
    const ch = src[i];
    if (quote) {
      out += ch;
      if (ch === '\\') {
        out += src[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (ch === quote && tplDepth === 0) quote = null;
      else if (quote === '`' && ch === '{' && src[i - 1] === '$') tplDepth++;
      else if (quote === '`' && ch === '}' && tplDepth > 0) tplDepth--;
      i++;
      continue;
    }
    if (ch === '`' || ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
      i++;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') {
      if (depth === 0) break;
      depth--;
    } else if ((ch === ',' || ch === ';') && depth === 0) break;
    out += ch;
    i++;
  }
  return out.trim();
}

/**
 * Комментарии маскируются пробелами до разбора: в JSDoc лежат примеры вызовов
 * с выдуманными адресами, и без маскировки они шли бы за настоящие. Длина строки
 * сохраняется, поэтому номера строк и смещения остаются верными.
 */
export function maskComments(src) {
  let out = '';
  let i = 0;
  let quote = null;
  let tplDepth = 0;
  while (i < src.length) {
    const ch = src[i];
    if (quote) {
      out += ch;
      if (ch === '\\') {
        out += src[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (ch === quote && tplDepth === 0) quote = null;
      else if (quote === '`' && ch === '{' && src[i - 1] === '$') tplDepth++;
      else if (quote === '`' && ch === '}' && tplDepth > 0) tplDepth--;
      i++;
      continue;
    }
    if (ch === '`' || ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
      i++;
      continue;
    }
    if (ch === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') {
        out += ' ';
        i++;
      }
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        out += src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      out += '  ';
      i += 2;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/**
 * Вызовы http-клиента в одном файле. Обобщённый параметр может отсутствовать -
 * тогда `type` пуст, но маршрут всё равно под охраной.
 */
export function extractCallSites(source) {
  const src = maskComments(source);
  const sites = [];
  CALL_RE.lastIndex = 0;
  let m;
  while ((m = CALL_RE.exec(src)) !== null) {
    let type = '';
    let cursor = CALL_RE.lastIndex;
    if (m[2] === '<') {
      const close = skipGeneric(src, cursor);
      if (close === -1) {
        // Не разобрали обобщённый параметр - об этом надо сказать, а не пройти мимо:
        // молчаливый пропуск вызова неотличим от «всё сходится».
        sites.push({
          line: src.slice(0, m.index).split('\n').length,
          method: m[1].toLowerCase(),
          type: '',
          urlExpression: '',
          index: m.index,
          unparsed: true,
        });
        continue;
      }
      type = src.slice(cursor, close).trim().replace(/\s+/g, ' ');
      cursor = close + 1;
    }
    while (cursor < src.length && /\s/.test(src[cursor])) cursor++;
    // Без скобки сразу за именем это не вызов, а упоминание: импорт, реэкспорт, тип.
    if (src[cursor] !== '(') continue;
    cursor++;
    while (cursor < src.length && /\s/.test(src[cursor])) cursor++;
    sites.push({
      line: src.slice(0, m.index).split('\n').length,
      method: m[1].toLowerCase(),
      type,
      urlExpression: readArgument(src, cursor),
      index: m.index,
    });
    CALL_RE.lastIndex = cursor;
  }
  return sites;
}

/** Спаны `${...}` шаблона со счётом вложенных фигурных скобок. */
function templateSpans(content) {
  const spans = [];
  for (let i = 0; i < content.length; i++) {
    if (content[i] !== '$' || content[i + 1] !== '{') continue;
    let depth = 1;
    let j = i + 2;
    while (j < content.length && depth > 0) {
      if (content[j] === '{') depth++;
      else if (content[j] === '}') depth--;
      j++;
    }
    spans.push({ start: i, end: j, inner: content.slice(i + 2, j - 1).trim() });
    i = j - 1;
  }
  return spans;
}

/**
 * Адрес вызова в форме пути OpenAPI: подстановки заменены на {p}, запрос отрезан.
 * Идентификатор, объявленный выше по файлу, разрешается на шаг вглубь; `buildLangPath`
 * знает форму `/{lang}/...`. Что не разрешилось - null: гейт краснеет, а не молчит.
 */
export function resolveUrl(expression, src, beforeIndex, depth = 0) {
  if (depth > 8) return null;
  const expr = expression.trim();

  const literal = expr.match(/^([`'"])([\s\S]*)\1$/);
  if (literal) {
    const raw = literal[2];
    if (literal[1] !== '`') return cutQuery(raw);
    let out = '';
    let cursor = 0;
    for (const span of templateSpans(raw)) {
      out += raw.slice(cursor, span.start);
      const part = classifySubstitution(span.inner, src, beforeIndex, depth + 1);
      // Подстановка, которая может дать только строку запроса, к пути не относится:
      // всё, что за ней, - тоже запрос, поэтому путь на ней и кончается.
      if (part.kind === 'query') return cutQuery(out);
      out += part.kind === 'path' ? part.value : PARAM;
      cursor = span.end;
    }
    out += raw.slice(cursor);
    return cutQuery(out);
  }

  const branches = splitConditional(expr);
  if (branches) {
    // Разрешаются ВСЕ ветви, и ни одна не отбрасывается: пока неразрешённые ветви
    // отфильтровывались, вызов зеленел по одной оставшейся - гейт закрывал глаза
    // именно там, где адрес собирается динамически. Сравнение со всеми ветвями сразу
    // отдаёт null и когда ветви разошлись, и когда любая из них не разобрана.
    const resolved = branches.map((b) => resolveUrl(b, src, beforeIndex, depth + 1));
    return resolved.every((v) => v !== null && v === resolved[0]) ? resolved[0] : null;
  }

  const langPath = expr.match(/^buildLangPath\s*\(\s*[^,]+,\s*([\s\S]+)\)\s*$/);
  if (langPath) {
    const tail = resolveUrl(langPath[1].trim(), src, beforeIndex, depth + 1);
    if (tail === null) return null;
    return cutQuery(`/${PARAM}/${tail.replace(/^\/+/, '')}`);
  }

  if (/^[A-Za-z_$][\w$]*$/.test(expr)) {
    const assignment = lastAssignmentBefore(src, expr, beforeIndex);
    if (assignment === null) return null;
    return resolveUrl(assignment, src, beforeIndex, depth + 1);
  }

  return null;
}

/**
 * Ветви тернарного выражения верхнего уровня. Скобки, шаблоны и `?.`/`??` не в счёт:
 * иначе `a?.b` разрезался бы как условие.
 */
export function splitConditional(expr) {
  let depth = 0;
  let quote = null;
  let question = -1;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '`' || ch === "'" || ch === '"') quote = ch;
    else if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (ch === '?' && depth === 0) {
      if (expr[i + 1] === '.' || expr[i + 1] === '?') {
        i++;
        continue;
      }
      question = i;
      break;
    }
  }
  if (question === -1) return null;

  depth = 0;
  quote = null;
  for (let i = question + 1; i < expr.length; i++) {
    const ch = expr[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '`' || ch === "'" || ch === '"') quote = ch;
    else if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (ch === ':' && depth === 0) {
      return [expr.slice(question + 1, i).trim(), expr.slice(i + 1).trim()];
    }
  }
  return null;
}

/**
 * Чем подстановка является для пути: куском пути, хвостом запроса или неизвестным.
 * Неизвестное становится {p} - параметром пути, и это самый строгий из вариантов.
 */
function classifySubstitution(inner, src, beforeIndex, depth) {
  if (depth > 8) return { kind: 'unknown' };
  const expr = inner.trim();
  if (!expr) return { kind: 'query' };

  const literal = expr.match(/^([`'"])([\s\S]*)\1$/);
  if (literal) {
    const raw = literal[2];
    if (raw === '' || raw.startsWith('?')) return { kind: 'query' };
    const value = resolveUrl(expr, src, beforeIndex, depth);
    return value === null ? { kind: 'unknown' } : { kind: 'path', value };
  }

  const branches = splitConditional(expr);
  if (branches) {
    const kinds = branches.map((b) => classifySubstitution(b, src, beforeIndex, depth + 1));
    if (kinds.every((k) => k.kind === 'query')) return { kind: 'query' };
    const paths = kinds.filter((k) => k.kind === 'path');
    if (paths.length === kinds.length && paths.every((p) => p.value === paths[0].value)) return paths[0];
    return { kind: 'unknown' };
  }

  if (/^[A-Za-z_$][\w$]*$/.test(expr)) {
    const assignment = lastAssignmentBefore(src, expr, beforeIndex);
    if (assignment === null) return { kind: 'unknown' };
    return classifySubstitution(assignment, src, beforeIndex, depth + 1);
  }

  const value = resolveUrl(expr, src, beforeIndex, depth + 1);
  return value === null ? { kind: 'unknown' } : { kind: 'path', value };
}

/** Последнее присваивание идентификатора выше места вызова - не первое по файлу. */
function lastAssignmentBefore(src, name, beforeIndex) {
  const re = new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*`, 'g');
  let found = null;
  let m;
  while ((m = re.exec(src)) !== null) {
    if (m.index >= beforeIndex) break;
    found = m.index + m[0].length;
  }
  if (found === null) return null;
  return readArgument(src, found);
}

function cutQuery(url) {
  const cut = url.split('?')[0].split('#')[0];
  return cut.length ? cut : null;
}

/** Путь OpenAPI в той же форме, что и разрешённый адрес вызова. */
export function normalizeApiPath(path) {
  return path.replace(/\{[^}]*\}/g, PARAM);
}

/** Индекс «нормализованный путь -> путь как он записан в схеме». */
export function indexApiPaths(doc) {
  const index = new Map();
  for (const path of Object.keys(doc.paths ?? {})) index.set(normalizeApiPath(path), path);
  return index;
}

/** Схема успешного ответа операции плюс код, под которым она объявлена. */
export function successResponseSchema(operation) {
  const responses = operation?.responses ?? {};
  for (const code of ['200', '201']) {
    const response = responses[code];
    if (!response) continue;
    const content = response.content?.['application/json'] ?? Object.values(response.content ?? {})[0];
    if (content?.schema) return { code: Number(code), schema: content.schema };
  }
  return null;
}

/**
 * Имена полей ответа списком точечных путей: `items[].bookVersion.title`.
 * Именно поля, а не форма: пропажа поля - то, ради чего заведена запись.
 */
export function collectResponseFields(schema, doc, seen = new Set(), prefix = '', out = new Set()) {
  if (!schema || typeof schema !== 'object') return out;

  if (schema.$ref) {
    const name = schema.$ref.replace('#/components/schemas/', '');
    if (seen.has(name)) return out;
    const target = doc.components?.schemas?.[name];
    return collectResponseFields(target, doc, new Set([...seen, name]), prefix, out);
  }

  for (const key of ['allOf', 'oneOf', 'anyOf']) {
    if (Array.isArray(schema[key])) {
      for (const variant of schema[key]) collectResponseFields(variant, doc, seen, prefix, out);
    }
  }

  if (schema.type === 'array' || schema.items) {
    return collectResponseFields(schema.items, doc, seen, `${prefix}[]`, out);
  }

  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    const path = prefix ? `${prefix}.${name}` : name;
    out.add(path);
    collectResponseFields(property, doc, seen, path, out);
  }

  return out;
}

/**
 * Поверхность: по одной записи на зовомую фронтом пару метод+путь.
 * `fields` пуст, когда бэкенд ответ не описал, - это видно, а не спрятано.
 */
export function buildSurface(callSites, doc) {
  const index = indexApiPaths(doc);
  const unresolved = [];
  const unknownRoutes = [];
  const routes = new Map();

  for (const site of callSites) {
    if (site.unparsed || site.url === null) {
      unresolved.push(site);
      continue;
    }
    const path = index.get(site.url);
    if (!path) {
      unknownRoutes.push(site);
      continue;
    }
    const operation = doc.paths[path]?.[site.method];
    if (!operation) {
      unknownRoutes.push(site);
      continue;
    }
    const success = successResponseSchema(operation);
    const key = `${site.method.toUpperCase()} ${path}`;
    routes.set(key, {
      route: key,
      hasResponseSchema: Boolean(success),
      fields: success ? [...collectResponseFields(success.schema, doc)].sort() : [],
    });
  }

  return {
    unresolved,
    unknownRoutes,
    routes: [...routes.values()].sort((a, b) => a.route.localeCompare(b.route)),
  };
}

/**
 * Сверка со снимком. Красное дают: пропавший маршрут, потерянная схема ответа,
 * пропавшее поле. Появление нового тоже красное - снимок обязан быть пересчитан
 * тем же прогоном, иначе он тихо отстаёт от схемы.
 */
export function compareSurface(committed, current) {
  const problems = [];
  const before = new Map((committed.routes ?? []).map((r) => [r.route, r]));
  const after = new Map((current.routes ?? []).map((r) => [r.route, r]));

  for (const [route, old] of before) {
    const now = after.get(route);
    if (!now) {
      problems.push({ kind: 'route-gone', route, detail: 'маршрут есть в снимке, но фронт его больше не зовёт или бэкенд его снял' });
      continue;
    }
    if (old.hasResponseSchema && !now.hasResponseSchema) {
      problems.push({ kind: 'schema-lost', route, detail: 'у маршрута была схема ответа, теперь её нет' });
    }
    const gone = (old.fields ?? []).filter((f) => !(now.fields ?? []).includes(f));
    for (const field of gone) {
      problems.push({ kind: 'field-gone', route, detail: `поле ответа пропало: ${field}` });
    }
    const added = (now.fields ?? []).filter((f) => !(old.fields ?? []).includes(f));
    for (const field of added) {
      problems.push({ kind: 'field-new', route, detail: `поле ответа появилось: ${field}` });
    }
  }

  for (const route of after.keys()) {
    if (!before.has(route)) {
      problems.push({ kind: 'route-new', route, detail: 'маршрут зовётся фронтом, но его нет в снимке' });
    }
  }

  return problems;
}

export { shouldAcceptUpdate } from './snapshot-update.mjs';
