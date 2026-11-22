'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
import { parseChapterParam, parseParagraphParam, withoutChapterParam } from './chapterParam';

/** Место из ссылки: глава `?chapter=N` и абзац `&p=K` (`F08-10a`). */
export interface LinkedPlace {
  chapter: number | null;
  paragraph: number | null;
}

/**
 * Глава из ссылки `?chapter=N` - общая для читалки (F03-2, ссылки «глава N» анализа) и плеера
 * («Слушать» у сцены мира книги, решение `F08 | F08-3` Q6).
 *
 * Номер читается один раз, **в эффекте**: при переходе по `next/link` адрес меняется уже после
 * рендера, и рендер увидел бы ещё адрес прошлой страницы без `?chapter`. Применяется, как только
 * пришёл список глав, - не дожидаясь прогресса: 503 на прогрессе или долгое слияние у вошедшего
 * иначе открывали бы главу 1 вместо главы из ссылки. Найдена глава - `onLinked(index)` (клиент
 * ставит индекс и отмечает, что место выбрано), параметр снимается с адреса, чтобы перезагрузка
 * снова не увела с места на главу из ссылки. Номер не целый или главы нет - ничего: работает
 * обычное восстановление.
 *
 * 🔴 Хук вызывается раньше эффекта восстановления клиента: эффекты одной фиксации идут в порядке
 * объявления, и восстановление в той же фиксации должно уже видеть отметку `onLinked`.
 *
 * 🔴 Читается один раз, а не в каждом эффекте заново: применение главы снимает параметр с адреса,
 * и эффект смены слага читалки в той же фиксации прочитал бы адрес уже без главы (канонический
 * слаг и место в книге - решение арбитра `F03 | F03-3`, В2).
 *
 * Абзац `&p=K` (`F08-10a`) читается тем же разом и уходит вторым аргументом `onLinked`: его
 * применяет читалка, плеер его не читает.
 *
 * Возвращает место из адреса - номер главы и абзаца (`null` - не было или мусор): читалке оно
 * нужно, чтобы смена слага не потеряла ни главу, ни абзац.
 */
export function useLinkedChapter(
  chapters: readonly { number: number }[],
  onLinked: (index: number, paragraph: number | null) => void
): MutableRefObject<LinkedPlace> {
  const placeRef = useRef<LinkedPlace>({ chapter: null, paragraph: null });
  const readRef = useRef(false);
  const appliedRef = useRef(false);
  const onLinkedRef = useRef(onLinked);
  onLinkedRef.current = onLinked;

  useEffect(() => {
    if (readRef.current) return;
    readRef.current = true;
    placeRef.current = {
      chapter: parseChapterParam(window.location.search),
      paragraph: parseParagraphParam(window.location.search),
    };
  }, []);

  useEffect(() => {
    if (appliedRef.current || chapters.length === 0) return;
    appliedRef.current = true;
    const { chapter: linked, paragraph } = placeRef.current;
    const index = linked === null ? -1 : chapters.findIndex((c) => c.number === linked);
    if (index === -1) return;
    onLinkedRef.current(index, paragraph);
    const { pathname, search, hash } = window.location;
    window.history.replaceState(
      window.history.state,
      '',
      `${pathname}${withoutChapterParam(search)}${hash}`
    );
  }, [chapters]);

  return placeRef;
}
