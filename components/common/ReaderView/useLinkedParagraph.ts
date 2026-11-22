import { useEffect, useRef, type RefObject } from 'react';
import type { ReaderLinkedParagraph } from './ReaderView.types';
import { isPlainChapter, showLinkedParagraph } from './readerParagraphs';

/**
 * Абзац главы из ссылки «Читать сцену» (`?chapter=N&p=K`, `F08-10a`): прокрутка к нему и подсветка
 * классом `className`, один раз на ссылку и только когда на экране её глава. Хук объявляется после
 * эффекта прокрутки главы в начало: эффекты одной фиксации идут по порядку, и абзац должен
 * перебить начало главы. Plain-глава номеров абзаца не держит - остаётся начало главы
 * (решение арбитра `F08 | F08-10` Q2).
 */
export function useLinkedParagraph(
  bodyRef: RefObject<HTMLElement | null>,
  chapter: { id?: string; content?: string } | undefined,
  linked: ReaderLinkedParagraph | null | undefined,
  className: string
): void {
  const appliedRef = useRef<ReaderLinkedParagraph | null>(null);
  const chapterId = chapter?.id;
  const content = chapter?.content ?? '';

  useEffect(() => {
    if (!linked || appliedRef.current === linked) return;
    if (linked.chapterId !== chapterId || !bodyRef.current) return;
    appliedRef.current = linked;
    if (isPlainChapter(content)) return;
    const body = bodyRef.current.firstElementChild;
    if (body) showLinkedParagraph(body, linked.n, className);
  }, [linked, chapterId, content, bodyRef, className]);
}
