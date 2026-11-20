import { decodeEntities, htmlEntityPattern } from '@/lib/utils/html-entities';
import type { BookWorldListEntity } from '@/types/api-schema';

/**
 * Перелинковка (F08-5, `product.md` §11, `tech.md` §7): имена героев и «глава N» в готовом тексте
 * становятся ссылками при показе страницы. Чистые функции без React и API - их проверяют юнитами.
 * Разметка текста не меняется: ссылки ставятся только в текстовые узлы.
 */

/** Не больше 15 ссылок на имена на страницу (§11 п.1). */
export const LINK_ENTITIES_PAGE_LIMIT = 15;

/** Короче трёх букв форма не ищется (как `mentionForms` бэкенда). */
const FORM_MIN_LETTERS = 3;

/** Кавычки и апострофы свёртки - один набор на `foldMention` и поиск по тексту. */
const QUOTE_CHARS = '«»“”„‟';
const APOSTROPHE_CHARS = '‘’‚‛';

const foldQuoteChar = (c: string) =>
  QUOTE_CHARS.includes(c) ? '"' : APOSTROPHE_CHARS.includes(c) ? "'" : c;

/** Кавычки и апострофы по символу: длина строки не меняется. */
const foldQuoteChars = (text: string) => [...text].map(foldQuoteChar).join('');

/**
 * Свёртка формы для сравнения - копия `foldMention` бэкенда в том же порядке шагов
 * (`foldQuote` в `quote-check.ts`): кавычки «»“”„‟ -> `"`, апострофы ‘’‚‛ -> `'`, пробелы в один,
 * обрезка, NFC, нижний регистр всей строки (`İ` -> `i̇`, конечная `Σ` -> `ς`), затем `ё` = `е`.
 */
export function foldMention(value: string): string {
  return foldMentionKeepingYo(value).replace(/ё/g, 'е');
}

/** Та же свёртка без замены `ё` - вариант формы для текста в разложенном виде (NFD). */
function foldMentionKeepingYo(value: string): string {
  return foldQuoteChars(value).replace(/\s+/g, ' ').trim().normalize('NFC').toLowerCase();
}

/**
 * Свёртка текста для поиска с сохранением длины: позиции в свёрнутом тексте совпадают с позициями
 * в исходном. Пробелы не склеиваются (форму ищем с `\s+` между словами). Символ, у которого нижний
 * регистр меняет длину (`İ`), остаётся как есть, а регистр контекстный (`Σ` в конце слова) не
 * учитывается: такие формы в тексте не находятся - ссылка пропущена, а не ложная (§11 п.6).
 */
export function foldKeepingLength(text: string): string {
  let out = '';
  for (const ch of text) {
    let c = foldQuoteChar(ch);
    const lower = c.toLowerCase();
    c = lower.length === c.length ? lower : c;
    out += c === 'ё' ? 'е' : c;
  }
  return out;
}

/**
 * У сущности есть страница: с ядром и не строка редактора. Одно правило на ссылки в тексте,
 * карточки и блок «Герои книги».
 */
export function isLinkableEntity(e: { hasCore: boolean; editor?: unknown }): boolean {
  return e.hasCore && !e.editor;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Граница слова - как `continuesWord` бэкенда (`quote-check.ts`): буква, цифра или знак над буквой. */
const WORD_BEFORE = '(?<![\\p{L}\\p{N}\\p{M}])';
const WORD_AFTER = '(?![\\p{L}\\p{N}\\p{M}])';

export interface LinkTarget {
  key: string;
  href: string;
  /**
   * Форма пишется с заглавной: упоминание со строчной («hope» у героя Hope) ссылкой не становится
   * (решение арбитра `F08 | F08-5b` Q11). Поиск по свёрнутому виду - как у бэкенда.
   */
  capital: boolean;
  /** Тип сущности: «Подробнее о герое» по имени - только на героя (решение арбитра Q3, круг 3). */
  type: string;
}

/** Первая буква заглавная: у неё есть отличный от неё нижний регистр. */
function startsWithCapital(text: string): boolean {
  const first = [...text].find((c) => /\p{L}/u.test(c));
  return first !== undefined && first !== first.toLowerCase();
}

export interface ChapterRule {
  /** Шаблон словаря `analysisChapter` (`Глава {n}`): число подставляется на место `{n}`. */
  template: string;
  /** Адрес главы или `null`, если такой главы в версии нет. */
  href: (n: number) => string | null;
}

export interface LinkIndex {
  /** Поиск имён в тексте; собирается при первом обращении. */
  readonly names: RegExp | null;
  byForm: Map<string, LinkTarget>;
  /** Адрес страницы каждой публичной сущности (карточки «Подробнее о герое»). */
  pageHref: Map<string, string>;
  chapter: { re: RegExp; href: (n: number) => string | null } | null;
}

/**
 * Индекс поиска по публичному списку мира (решения арбитра `F08 | F08-5` Q2, `F08 | F08-5b` Q12).
 * Владельцев формы считают по всем строкам списка, со страницей и без: форма у двух и более
 * сущностей или у сущности без страницы ссылки не даёт. Все формы идут в поиск, поэтому длинная
 * («Мария Болконская») занимает своё место в тексте, и короткая чужая («Мария») внутри неё не
 * находится. Сущность без `forms` (бэкенд не отдал) сама ссылки не получает, но владеет своим именем как помеха: чужая форма с тем же именем ссылки не даёт (ложная ссылка хуже пропущенной).
 */
export function buildLinkIndex(
  allEntities: readonly BookWorldListEntity[],
  hrefOf: (key: string) => string,
  chapter?: ChapterRule | null
): LinkIndex {
  // Пара героев (F08-8c) - не цель перелинковки по имени: её имя «А и Б» не должно ни ссылаться, ни
  // занимать в тексте место имён героев внутри себя (решение `F08 | F08-8c`, `product.md` §5 п.10).
  const entities = allEntities.filter((e) => e.type !== 'pair');
  const owners = new Map<string, Set<string>>();
  const variants = new Set<string>();
  const capitals = new Set<string>();
  const pageHref = new Map<string, string>();
  const byKey = new Map(entities.map((e) => [e.key, e]));
  for (const e of entities) {
    if (isLinkableEntity(e)) pageHref.set(e.key, hrefOf(e.key));
    // Нет форм (бэкенд не отдал или все отсеяны) - сущность всё равно владеет своим именем, но
    // только как помеха: чужая форма с тем же именем ссылки не даёт, а сама она ссылку не получит
    // (§11 п.6; решение арбитра по остатку круга 4). Ключ-помеха не совпадает ни с одной сущностью.
    const nameOnly = !e.forms || e.forms.length === 0;
    const ownForms = nameOnly ? (e.name ? [e.name] : []) : e.forms!;
    const ownerKey = nameOnly ? `\u0000${e.key}` : e.key;
    for (const form of ownForms) {
      const folded = foldMention(form);
      if ([...folded].filter((c) => /\p{L}/u.test(c)).length < FORM_MIN_LETTERS) continue;
      const keys = owners.get(folded) ?? new Set<string>();
      owners.set(folded, keys.add(ownerKey));
      if (startsWithCapital(form.trim())) capitals.add(folded);
      // Текст из редактора бывает в разложенном виде (NFD); `ё` в нём - `е` + U+0308, поэтому
      // вариант берётся и из формы до замены `ё`. Ключ поиска - всегда `foldMention` совпадения.
      variants.add(folded);
      variants.add(folded.normalize('NFD'));
      variants.add(foldMentionKeepingYo(form).normalize('NFD'));
    }
  }
  const byForm = new Map<string, LinkTarget>();
  for (const [folded, keys] of owners) {
    const [key] = [...keys];
    const owner = byKey.get(key);
    if (keys.size !== 1 || !owner || !isLinkableEntity(owner)) continue;
    byForm.set(folded, {
      key,
      href: hrefOf(key),
      capital: capitals.has(folded),
      type: owner.type,
    });
  }
  // Регэксп имён собирается при первом поиске в тексте: карточкам страницы книги нужен только `byForm`.
  let names: RegExp | null | undefined;
  const namesRegExp = (): RegExp | null => {
    if (names !== undefined) return names;
    const alternation = [...variants]
      .sort((a, b) => b.length - a.length)
      .map((f) => f.split(' ').map(escapeRegExp).join('\\s+'))
      .join('|');
    names = alternation ? new RegExp(`${WORD_BEFORE}(?:${alternation})${WORD_AFTER}`, 'gu') : null;
    return names;
  };
  let chapterRule: LinkIndex['chapter'] = null;
  if (chapter && chapter.template.includes('{n}')) {
    const [head, tail] = chapter.template.split('{n}');
    const body = (part: string) => escapeRegExp(foldKeepingLength(part)).replace(/ +/g, '\\s+');
    chapterRule = {
      re: new RegExp(`${WORD_BEFORE}${body(head)}(\\d{1,5})${body(tail)}${WORD_AFTER}`, 'gu'),
      href: chapter.href,
    };
  }
  return {
    get names() {
      return namesRegExp();
    },
    byForm,
    pageHref,
    chapter: chapterRule,
  };
}

/** Состояние одной страницы: что уже стало ссылкой и сколько ссылок поставлено. */
export interface LinkSession {
  index: LinkIndex;
  used: Set<string>;
  count: number;
  /** Страница самой сущности: ссылка на себя не ставится. */
  selfKey?: string;
  limit: number;
}

export function createLinkSession(
  index: LinkIndex,
  options: { selfKey?: string; limit?: number } = {}
): LinkSession {
  return {
    index,
    used: new Set(),
    count: 0,
    selfKey: options.selfKey,
    limit: options.limit ?? LINK_ENTITIES_PAGE_LIMIT,
  };
}

export type LinkSegment =
  | { kind: 'text'; text: string }
  | { kind: 'entity'; text: string; key: string; href: string }
  | { kind: 'chapter'; text: string; n: number; href: string };

/** Пары кавычек цитаты: открывающая -> закрывающие. */
const QUOTE_PAIRS: Record<string, string> = { '«': '»', '“': '”', '„': '“”', '"': '"' };

/**
 * Открытая кавычка абзаца. Одна на абзац, а не на текстовый узел: цитата, разбитая тегом
 * (`«слова <em>Анны</em>»`), остаётся цитатой. Блочный тег её сбрасывает.
 */
export interface QuoteState {
  closers: string | null;
  /** Закрывающие кавычки в следующих текстовых узлах того же абзаца: пара открытой найдётся. */
  laterChars?: string;
}

function hasCloserAfter(text: string, i: number, closers: string, later = ''): boolean {
  for (const c of closers) if (text.includes(c, i + 1) || later.includes(c)) return true;
  return false;
}

/** Признак «внутри цитаты» для каждого символа; состояние кавычки переходит дальше. */
function quotedMask(text: string, state: QuoteState): boolean[] {
  const mask: boolean[] = new Array<boolean>(text.length);
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (state.closers) {
      mask[i] = true;
      if (state.closers.includes(ch)) state.closers = null;
    } else if (QUOTE_PAIRS[ch] && hasCloserAfter(text, i, QUOTE_PAIRS[ch], state.laterChars)) {
      // Кавычка без пары до конца абзаца - не цитата (дюймы, опечатка, одинокая «ёлочка»).
      mask[i] = true;
      state.closers = QUOTE_PAIRS[ch];
    } else {
      mask[i] = false;
    }
  }
  return mask;
}

interface Hit {
  start: number;
  end: number;
  segment: LinkSegment;
}

/**
 * Разбивает один фрагмент текста на сегменты; состояние страницы обновляется на месте.
 * `quote` - состояние кавычки абзаца, когда абзац разбит на несколько вызовов (`linkHtml`).
 */
export function linkText(
  text: string,
  session: LinkSession,
  quote: QuoteState = { closers: null }
): LinkSegment[] {
  const { index } = session;
  const quoted = quotedMask(text, quote);
  if (!text || (!index.names && !index.chapter)) return [{ kind: 'text', text }];
  const folded = foldKeepingLength(text);
  const inQuote = (i: number) => quoted[i] === true;
  const hits: Hit[] = [];
  if (index.names) {
    for (const m of folded.matchAll(index.names)) {
      const target = index.byForm.get(foldMention(m[0]));
      const found = text.slice(m.index, m.index + m[0].length);
      if (!target || (target.capital && !startsWithCapital(found))) continue;
      hits.push({
        start: m.index,
        end: m.index + m[0].length,
        segment: { kind: 'entity', text: found, key: target.key, href: target.href },
      });
    }
  }
  if (index.chapter) {
    for (const m of folded.matchAll(index.chapter.re)) {
      const n = Number(m[1]);
      const href = index.chapter.href(n);
      if (!href) continue;
      hits.push({
        start: m.index,
        end: m.index + m[0].length,
        segment: { kind: 'chapter', text: text.slice(m.index, m.index + m[0].length), n, href },
      });
    }
  }
  hits.sort((a, b) => a.start - b.start || b.end - a.end);

  const out: LinkSegment[] = [];
  let pos = 0;
  for (const hit of hits) {
    if (hit.start < pos || inQuote(hit.start)) continue;
    if (hit.segment.kind === 'entity') {
      const { key } = hit.segment;
      if (key === session.selfKey || session.used.has(key) || session.count >= session.limit)
        continue;
      session.used.add(key);
      session.count += 1;
    }
    if (hit.start > pos) out.push({ kind: 'text', text: text.slice(pos, hit.start) });
    out.push(hit.segment);
    pos = hit.end;
  }
  if (pos < text.length) out.push({ kind: 'text', text: text.slice(pos) });
  return out.length > 0 ? out : [{ kind: 'text', text }];
}

const escapeAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Внутри этих тегов ссылок нет: заголовки, цитаты, уже стоящая ссылка. */
const NO_LINK_TAGS = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'q',
  'a',
  'cite',
  'code',
  'pre',
]);
const VOID_TAGS = new Set(['br', 'hr', 'img', 'wbr', 'input', 'meta', 'link']);
/** Блочные теги: на их границе незакрытая кавычка абзаца сбрасывается. */
const BLOCK_TAGS = new Set([
  'p',
  'li',
  'div',
  'dd',
  'dt',
  'td',
  'th',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
]);

/**
 * Раскодирует сущности текстового узла и помнит, откуда в исходнике взят каждый символ:
 * `from[i]`..`to[i]` - кусок `raw`, давший `text[i]`. Ссылка режет исходник по этим границам,
 * а всё между ссылками копируется как было - сущности и байты вне ссылок не меняются.
 */
function decodeWithMap(raw: string): { text: string; from: number[]; to: number[] } {
  let text = '';
  const from: number[] = [];
  const to: number[] = [];
  const push = (chars: string, start: number, end: number) => {
    for (let i = 0; i < chars.length; i += 1) {
      from.push(start);
      to.push(end);
    }
    text += chars;
  };
  let pos = 0;
  for (const m of raw.matchAll(htmlEntityPattern())) {
    for (let i = pos; i < m.index; i += 1) push(raw[i], i, i + 1);
    push(decodeEntities(m[0]), m.index, m.index + m[0].length);
    pos = m.index + m[0].length;
  }
  for (let i = pos; i < raw.length; i += 1) push(raw[i], i, i + 1);
  return { text, from, to };
}

/**
 * Ссылки в HTML пересказа - вход это вывод `sanitizeRichHtml` (правильный HTML). Теги и текст вне
 * ссылок идут байт в байт; ссылки появляются только в текстовых узлах вне `NO_LINK_TAGS`.
 */
export function linkHtml(safeHtml: string, session: LinkSession): string {
  const parts = safeHtml.split(/(<[^>]*>)/);
  const isTag = (part: string) => part.startsWith('<') && part.endsWith('>');
  const blockTagOf = (part: string) => {
    const m = /^<\/?([a-z][a-z0-9]*)/i.exec(part);
    return m !== null && BLOCK_TAGS.has(m[1].toLowerCase());
  };
  // Есть ли прямая кавычка в следующих текстовых узлах того же абзаца: пара цитаты через тег.
  // Каждый текстовый узел раскодируется один раз: и для этого прохода, и для основного.
  const laterChars: string[] = new Array<string>(parts.length).fill('');
  const decoded = new Map<number, ReturnType<typeof decodeWithMap>>();
  for (let i = parts.length - 1, seen = ''; i >= 0; i -= 1) {
    const part = parts[i];
    if (isTag(part)) {
      if (blockTagOf(part)) seen = '';
      continue;
    }
    laterChars[i] = seen;
    const node = decodeWithMap(part);
    decoded.set(i, node);
    for (const c of '»”“"') if (node.text.includes(c) && !seen.includes(c)) seen += c;
  }
  const stack: string[] = [];
  const quote: QuoteState = { closers: null };
  let blocked = 0;
  let out = '';
  for (const [partIndex, part] of parts.entries()) {
    if (isTag(part)) {
      const m = /^<(\/?)([a-z][a-z0-9]*)/i.exec(part);
      if (m && !part.startsWith('<!')) {
        const tag = m[2].toLowerCase();
        if (BLOCK_TAGS.has(tag)) quote.closers = null;
        if (m[1]) {
          const at = stack.lastIndexOf(tag);
          if (at >= 0) {
            for (const closed of stack.splice(at)) if (NO_LINK_TAGS.has(closed)) blocked -= 1;
          }
        } else if (!VOID_TAGS.has(tag) && !part.endsWith('/>')) {
          stack.push(tag);
          if (NO_LINK_TAGS.has(tag)) blocked += 1;
        }
      }
      out += part;
      continue;
    }
    const { text, from, to } = decoded.get(partIndex) ?? decodeWithMap(part);
    quote.laterChars = laterChars[partIndex];
    if (blocked > 0 || part === '') {
      // Закрывающая кавычка внутри ссылки/цитаты закрывает цитату абзаца, хотя сам узел не линкуется.
      quotedMask(text, quote);
      out += part;
      continue;
    }
    let pos = 0;
    let copied = 0;
    for (const seg of linkText(text, session, quote)) {
      if (seg.kind !== 'text') {
        const start = from[pos];
        const end = to[pos + seg.text.length - 1];
        out += `${part.slice(copied, start)}<a href="${escapeAttr(seg.href)}">${part.slice(start, end)}</a>`;
        copied = end;
      }
      pos += seg.text.length;
    }
    out += part.slice(copied);
  }
  return out;
}

/**
 * Страница сущности для карточки без ключа (список героев обзора книги): полное совпадение
 * свёрнутого имени с формой ровно одной сущности списка любого типа и со страницей; нет совпадения,
 * их несколько или единственный владелец другого типа - null. Имя короче трёх букв не ищется:
 * таких форм бэкенд не отдаёт, второго владельца не проверить (решения арбитра `F08 | F08-5` Q3
 * и `F08 | F08-5b` Q3, круг 3).
 */
export function entityHrefByName(index: LinkIndex, name: string, type?: string): string | null {
  const target = index.byForm.get(foldMention(name));
  if (!target || (type !== undefined && target.type !== type)) return null;
  return target.href;
}

/**
 * Ссылка на сущность уже стоит на странице помимо текста (заголовок карточки героя): её имя
 * в тексте больше ссылкой не становится и слот предела не тратит (§11 п.1 «одна на сущность»).
 */
export function markLinked(session: LinkSession | null, key: string): void {
  session?.used.add(key);
}
