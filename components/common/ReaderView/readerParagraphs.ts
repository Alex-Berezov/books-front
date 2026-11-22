/**
 * Абзацы главы в читалке - то же разбиение, что у бэкенда: абзац K сцены мира книги
 * (`?chapter=N&p=K`) - `paragraphsOf(htmlToParagraphs(content))[K - 1]` в
 * `books/src/modules/translation/content-draft/content-draft.text.ts` (раскладка блоков -
 * `books/src/modules/translation/chapter-blocks.ts`, `splitChapter`). Здесь то же правило по DOM,
 * который отдаёт `RichTextContent` (решение арбитра `F08 | F08-10` Q2). Совпадение держит общая
 * фикстура `reader-paragraphs.json` - побайтная копия в `books/test/fixtures` и
 * `__tests__/fixtures`: разойдутся правила - «Читать сцену» откроет не тот абзац.
 *
 * Правило: блочный тег - свой блок (`p`, `h1`-`h6`, `pre` - целиком; `blockquote`, `li`,
 * `figcaption`, `ul`, `ol` - контейнеры, внутри которых подряд идущие строчные узлы - один блок);
 * в `figure` каждый строчный узел отдельно, картинка - не абзац; `hr` и блок без видимого текста -
 * не абзац; заголовок - абзац. Plain-глава (текст без тегов, `isPlainChapter`) номеров абзаца
 * не держит: читалка остаётся в начале главы (решение арбитра `F08 | F08-10` Q2).
 */

import { INVISIBLE_CHARS } from '@/lib/utils/html-text';

const LEAF_BLOCKS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre']);
const BLOCK_TAGS = new Set([
  ...LEAF_BLOCKS,
  'blockquote',
  'ul',
  'ol',
  'li',
  'hr',
  'figure',
  'figcaption',
]);

/** Глава без единого тега - plain-текст: то же правило, что `isPlainText` в `chapter-blocks.ts` бэкенда. */
export function isPlainChapter(content: string): boolean {
  return !/<[a-zA-Z/!]/.test(content);
}

export interface ReaderParagraph {
  /** Узлы абзаца: один элемент у листового блока, несколько - у строчных узлов подряд. */
  nodes: Node[];
  /** Видимый текст в виде `htmlToParagraphs`: заголовок - с `## `. */
  text: string;
}

const tagOf = (node: Node): string | null =>
  node.nodeType === Node.ELEMENT_NODE ? (node as Element).tagName.toLowerCase() : null;

/** Текст узлов: `br` - пробел, строчные теги снимаются без пробела, пробелы схлопнуты. */
function visibleText(nodes: readonly Node[]): string {
  const parts: string[] = [];
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.nodeValue ?? '');
      return;
    }
    if (tagOf(node) === 'br') {
      parts.push(' ');
      return;
    }
    node.childNodes.forEach(visit);
  };
  nodes.forEach(visit);
  return parts.join('').replace(INVISIBLE_CHARS, '').replace(/\s+/g, ' ').trim();
}

function push(out: ReaderParagraph[], nodes: Node[], heading = false): void {
  const text = visibleText(nodes);
  if (text !== '') {
    out.push({ nodes, text: heading ? `## ${text}` : text });
    return;
  }
  // Заголовок из одной картинки бэкенд считает абзацем `##`: блок с `img` не пустой (`isBlank`),
  // а фильтр `htmlToParagraphs` снимает только `'##'` без пробела. Правило повторено как есть.
  const [node] = nodes;
  if (heading && node.nodeType === Node.ELEMENT_NODE && (node as Element).querySelector('img')) {
    out.push({ nodes, text: '##' });
  }
}

function walk(container: Node, out: ReaderParagraph[]): void {
  let run: Node[] = [];
  const flush = () => {
    if (run.length > 0) push(out, run);
    run = [];
  };
  container.childNodes.forEach((child) => {
    const tag = tagOf(child);
    if (tag === null || !BLOCK_TAGS.has(tag)) {
      if (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.ELEMENT_NODE)
        run.push(child);
      return;
    }
    flush();
    visitBlock(child as Element, tag, out);
  });
  flush();
}

function visitBlock(node: Element, tag: string, out: ReaderParagraph[]): void {
  if (LEAF_BLOCKS.has(tag)) {
    push(out, [node], /^h[1-6]$/.test(tag));
    return;
  }
  if (tag === 'hr') return;
  if (tag === 'figure') {
    node.childNodes.forEach((child) => {
      const childTag = tagOf(child);
      if (childTag !== null && BLOCK_TAGS.has(childTag)) {
        visitBlock(child as Element, childTag, out);
        return;
      }
      // Картинка в `figure` - `alt`/`title` или оболочка, абзацем не считается.
      if (childTag === 'img' || (child as Element).querySelector?.('img')) return;
      push(out, [child]);
    });
    return;
  }
  walk(node, out);
}

/** Действия читателя, после которых догрузка картинок больше не возвращает к абзацу. */
const USER_INPUT = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

/** Абзацы главы по её контейнеру в DOM, по порядку; номер абзаца K - элемент `K - 1`. */
export function readerParagraphs(container: Element): ReaderParagraph[] {
  const out: ReaderParagraph[] = [];
  walk(container, out);
  return out;
}

/**
 * Прокрутить к абзацу `n` (с 1) и подсветить его классом `className`. Строчные узлы подряд
 * оборачиваются в `span` - иначе подсвечивать нечего. Картинка выше абзаца, ещё не догруженная,
 * сдвинет его вниз: после её `load` прокрутка повторяется - пока читатель сам не тронул страницу
 * (колесо, касание, клавиша): дальше место выбирает он. Нет такого абзаца - `false`, глава
 * остаётся в начале (решение арбитра `F08 | F08-10` Q2).
 */
export function showLinkedParagraph(container: Element, n: number, className: string): boolean {
  const paragraph = readerParagraphs(container)[n - 1];
  if (!paragraph) return false;
  const [first] = paragraph.nodes;
  let target: Element;
  if (paragraph.nodes.length === 1 && first.nodeType === Node.ELEMENT_NODE) {
    target = first as Element;
  } else {
    target = document.createElement('span');
    first.parentNode?.insertBefore(target, first);
    paragraph.nodes.forEach((node) => target.appendChild(node));
  }
  target.classList.add(className);
  const scroll = () => target.scrollIntoView?.({ block: 'center' });
  scroll();
  const pending = [...container.querySelectorAll('img')].filter(
    (img) => !img.complete && img.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING
  );
  if (pending.length === 0) return true;
  const stop = () => {
    pending.forEach((img) => img.removeEventListener('load', scroll));
    USER_INPUT.forEach((type) => window.removeEventListener(type, stop));
  };
  pending.forEach((img) => img.addEventListener('load', scroll, { once: true }));
  USER_INPUT.forEach((type) => window.addEventListener(type, stop, { once: true, passive: true }));
  return true;
}
