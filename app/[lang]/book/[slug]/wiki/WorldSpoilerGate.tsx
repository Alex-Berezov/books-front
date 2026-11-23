'use client';

import { useEffect, useId, useRef, useState, type FC, type ReactNode } from 'react';
import { useProgress } from '@/api/hooks/useProgress';
// Мимо бочки `@/lib/reading-progress`: она тянет в чанк страницы localProgress и слияние (-1.8 kB, F08-10b).
import { useProgressIdentity } from '@/lib/reading-progress/useProgressTarget';
import styles from './wiki.module.scss';

export interface WorldSpoilerGateProps {
  versionId: string;
  /** Глава элемента; вызывающий оборачивает только элемент с главой из `chapterNumbers` версии (Q5). */
  chapter: number;
  /** «Откроется после главы M — или» с уже подставленной главой: строки мира - `server-only`, сюда пропом. */
  hiddenLabel: string;
  /** «раскрыть сейчас». */
  revealLabel: string;
  /** Класс ячейки подписи сверх своего: у цитаты - класс карточки `QuotesBlock`, чтобы ячейка сетки была в рамке. */
  noticeClassName?: string;
  children: ReactNode;
}

/**
 * Спойлер-остров страницы сущности (`F08-10b`, решения `F08 | F08-10` (4) и `F08 | F08-10b`):
 * элемент с главой больше текстовой главы читателя по этой версии сворачивается с подписью
 * и раскрывается одним нажатием, раскрытие живёт только в состоянии элемента.
 *
 * 🔴 Серверный HTML один для всех: первый рендер всегда раскрыт, свёртка - только после
 * гидратации (`mounted`). Прогресс из кэша React Query (пришли из читалки) есть уже в первом
 * клиентском рендере, и без флага разметка разошлась бы с серверной.
 *
 * Сворачивает только вошедший с пригодной сессией (`target === 'server'`) и известной главой:
 * аноним, `unknown`, `local`, отказ запроса и `null`-прогресс - всё раскрыто. Текст свёрнутого
 * элемента остаётся в DOM под `hidden`. После нажатия фокус уходит в раскрытый элемент: кнопка
 * исчезает, и без этого фокус падал бы на начало документа.
 */
export const WorldSpoilerGate: FC<WorldSpoilerGateProps> = ({
  versionId,
  chapter,
  hiddenLabel,
  revealLabel,
  noticeClassName,
  children,
}) => {
  const [mounted, setMounted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const focusOnReveal = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const bodyId = useId();
  const labelId = useId();
  useEffect(() => setMounted(true), []);

  const { target, userId } = useProgressIdentity();
  const { data: progress } = useProgress(versionId, userId ?? undefined, {
    // Без владельца в ключе кэша запрос не уходит: чужой прогресс на общем компьютере (`LEGACY-088`).
    enabled: target === 'server' && userId !== null,
  });

  const current = progress?.chapterNumber ?? null;
  // Владелец обязателен и здесь: выключенный запрос отдал бы запись из кэша под ключом без владельца.
  const live = target === 'server' && userId !== null;
  const folded = mounted && !revealed && live && current !== null && chapter > current;

  useEffect(() => {
    if (!revealed || !focusOnReveal.current) return;
    focusOnReveal.current = false;
    const first = bodyRef.current?.firstElementChild;
    if (!(first instanceof HTMLElement)) return;
    // Заголовок или карточка сами фокус не принимают: `tabindex="-1"` - фокус кодом, не Tab.
    if (first.tabIndex < 0 && !first.hasAttribute('tabindex')) first.setAttribute('tabindex', '-1');
    first.focus();
  }, [revealed]);

  const reveal = () => {
    focusOnReveal.current = true;
    setRevealed(true);
  };

  // Ячейка сетки цитат - в рамке карточки, подпись внутри неё: раскладка карточки (колонка) не рвёт
  // фразу и не бледнит рамку вместе с текстом.
  const wrapNotice = (notice: ReactNode) =>
    noticeClassName ? <div className={noticeClassName}>{notice}</div> : notice;

  return (
    <>
      {folded
        ? wrapNotice(
            <p className={styles.spoilerNotice}>
              <span id={labelId}>{hiddenLabel}</span>{' '}
              <button
                type="button"
                className={styles.spoilerReveal}
                aria-expanded={false}
                aria-controls={bodyId}
                aria-describedby={labelId}
                onClick={reveal}
              >
                {revealLabel}
              </button>
            </p>
          )
        : null}
      <div id={bodyId} ref={bodyRef} className={styles.spoilerBody} hidden={folded}>
        {children}
      </div>
    </>
  );
};
