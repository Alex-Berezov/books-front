import DOMPurify from 'dompurify';
import type sanitizeHtmlType from 'sanitize-html';

// Копия того же списка живёт в books/src/shared/sanitize/rich-html.ts; оба сверяются своими тестами (LEGACY-414).
export const RICH_HTML_ALLOWED_TAGS: readonly string[] = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'code',
  'pre',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'hr',
  'a',
  'img',
];

export const RICH_HTML_ALLOWED_ATTRIBUTES: Readonly<Record<string, readonly string[]>> = {
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  ol: ['start'],
  code: ['class'],
  p: ['style'],
  h1: ['style'],
  h2: ['style'],
  h3: ['style'],
  h4: ['style'],
  h5: ['style'],
  h6: ['style'],
};

export const RICH_HTML_ALLOWED_SCHEMES: readonly string[] = ['http', 'https', 'mailto'];
export const RICH_HTML_IMG_SCHEMES: readonly string[] = ['http', 'https'];

// Допустимые значения атрибутов, которые проверяются не только по имени. Входят в белый список и сверяются с бэкендом.
export const RICH_HTML_TEXT_ALIGN_STYLE =
  /^\s*text-align\s*:\s*(left|right|center|justify)\s*;?\s*$/i;
export const RICH_HTML_CODE_CLASS = /^language-[a-z0-9_+#-]+$/i;
const URL_SCHEME = /^([a-z][a-z0-9+.-]*):/i;
// Управляющие символы и пробелы внутри адреса браузер выбрасывает: `java\tscript:` для него — `javascript:`.
const URL_NOISE = /[\u0000- \u007f]/g;

function isAllowedValue(tag: string, attr: string, value: string): boolean {
  if (attr === 'style') return RICH_HTML_TEXT_ALIGN_STYLE.test(value);
  if (attr === 'class') return RICH_HTML_CODE_CLASS.test(value);
  if (attr === 'href' || attr === 'src') {
    const url = value.replace(URL_NOISE, '');
    // Две косые в любом сочетании (`//`, `\\`, `/\`) браузер читает как адрес другого хоста — как и launder на сервере.
    if (/^[/\\]{2}/.test(url)) return false;
    const scheme = URL_SCHEME.exec(url)?.[1]?.toLowerCase();
    if (scheme === undefined) return true;
    return (tag === 'img' ? RICH_HTML_IMG_SCHEMES : RICH_HTML_ALLOWED_SCHEMES).includes(scheme);
  }
  return true;
}

// Теги, которые выбрасываются вместе с содержимым: умолчания DOMPurify и sanitize-html плюс object/embed/select.
// Один список на бэкенд и обе ветки фронта — иначе один и тот же HTML даёт разный текст на сервере и в браузере.
export const RICH_HTML_DROP_CONTENT_TAGS: readonly string[] = [
  'annotation-xml',
  'audio',
  'colgroup',
  'desc',
  'embed',
  'foreignobject',
  'head',
  'iframe',
  'math',
  'mi',
  'mn',
  'mo',
  'ms',
  'mtext',
  'noembed',
  'noframes',
  'noscript',
  'object',
  'option',
  'plaintext',
  'script',
  'select',
  'style',
  'svg',
  'template',
  'textarea',
  'thead',
  'title',
  'video',
  'xmp',
];

const VALUE_CHECKED_ATTRIBUTES: readonly string[] = ['style', 'class'];

// Теги, у которых белый список разрешает атрибут с проверкой значения, выводятся из того же списка, а не пишутся рядом.
const VALUE_CHECKED_TAGS = Object.entries(RICH_HTML_ALLOWED_ATTRIBUTES)
  .filter(([, attrs]) => attrs.some((attr) => VALUE_CHECKED_ATTRIBUTES.includes(attr)))
  .map(([tag]) => tag);

function keepOnlySafeAttributes(
  tagName: string,
  attribs: sanitizeHtmlType.Attributes
): sanitizeHtmlType.Tag {
  const next: sanitizeHtmlType.Attributes = { ...attribs };
  for (const attr of VALUE_CHECKED_ATTRIBUTES) {
    const value = next[attr];
    if (value !== undefined && !isAllowedValue(tagName, attr, value)) delete next[attr];
  }
  return { tagName, attribs: next };
}

let serverOptions: sanitizeHtmlType.IOptions | null = null;

function sanitizeOnServer(sanitizeHtml: typeof sanitizeHtmlType, html: string): string {
  serverOptions ??= {
    allowedTags: [...RICH_HTML_ALLOWED_TAGS],
    allowedAttributes: Object.fromEntries(
      Object.entries(RICH_HTML_ALLOWED_ATTRIBUTES).map(([tag, attrs]) => [tag, [...attrs]])
    ),
    allowedSchemes: [...RICH_HTML_ALLOWED_SCHEMES],
    allowedSchemesByTag: { img: [...RICH_HTML_IMG_SCHEMES] },
    allowProtocolRelative: false,
    // Без разбора postcss: иначе `text-align: center` станет `text-align:center`, а DOMPurify оставит как было.
    parseStyleAttributes: false,
    nonTextTags: [...RICH_HTML_DROP_CONTENT_TAGS],
    transformTags: Object.fromEntries(
      VALUE_CHECKED_TAGS.map((tag) => [tag, keepOnlySafeAttributes])
    ),
  };
  return sanitizeHtml(html, serverOptions);
}

let purifier: ReturnType<typeof DOMPurify> | null = null;

function browserPurifier(): ReturnType<typeof DOMPurify> {
  if (purifier) return purifier;
  const instance = DOMPurify(window);
  // Атрибуты у DOMPurify разрешаются списком на все теги сразу; привязка к тегу и проверка значения — здесь.
  instance.addHook('uponSanitizeAttribute', (node, data) => {
    const tag = node.nodeName.toLowerCase();
    const allowed = RICH_HTML_ALLOWED_ATTRIBUTES[tag] ?? [];
    if (!allowed.includes(data.attrName) || !isAllowedValue(tag, data.attrName, data.attrValue)) {
      data.keepAttr = false;
    }
  });
  purifier = instance;
  return instance;
}

const BROWSER_OPTIONS = {
  ALLOWED_TAGS: [...RICH_HTML_ALLOWED_TAGS],
  ALLOWED_ATTR: [...new Set(Object.values(RICH_HTML_ALLOWED_ATTRIBUTES).flat())],
  FORBID_CONTENTS: [...RICH_HTML_DROP_CONTENT_TAGS],
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
};

function sanitizeInBrowser(html: string): string {
  return browserPurifier().sanitize(html, BROWSER_OPTIONS);
}

// Второй пояс: бэкенд чистит при записи, здесь — то, что лежало в базе до него (LEGACY-414).
// В Node (включая SSR клиентских компонентов) — sanitize-html, в браузере — DOMPurify: решение арбитра T27 по бюджету бандла.
export function sanitizeRichHtml(html: string): string {
  if (typeof window === 'undefined') {
    // require стоит прямо в ветке: Next подставляет `typeof window` при сборке клиента, и webpack не видит его вовсе.
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- статический import затащил бы sanitize-html и postcss в клиентские чанки (решение арбитра T27)
    const sanitizeHtml: typeof sanitizeHtmlType = require('sanitize-html');
    return sanitizeOnServer(sanitizeHtml, html);
  }
  return sanitizeInBrowser(html);
}
