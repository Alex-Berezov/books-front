'use client';

import { useEffect, useRef } from 'react';
import { sendWorldBeacon } from '@/api/endpoints/public-world-beacon';
import { classifyWorldHref } from '@/lib/world-beacon';
import type { WorldStatEvent } from '@/types/api-schema';
import styles from './WorldBeacon.module.scss';

interface WorldBeaconProps {
  bookVersionId: string;
  /** Ключ сущности; нет - общая страница `/wiki` (поле `key` в запрос не кладётся). */
  entityKey?: string;
  children: React.ReactNode;
}

/**
 * Счётчики переходов страницы мира книги (`product.md` §14): `view` - раз на загрузку страницы;
 * переход по ссылке в читалку, аудио, мир, анализ или пересказ - своё событие, а первый такой
 * переход на загрузку - ещё и `engaged`. Боты на фронте не отсеиваются: их глушит бэкенд.
 * Обёртка без собственной разметки (`display: contents`): клик ловится делегированием. Средняя
 * кнопка мыши (`auxclick`, `button === 1`) открывает ссылку в новой вкладке - это тот же переход.
 */
export function WorldBeacon({ bookVersionId, entityKey, children }: WorldBeaconProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewSent = useRef(false);
  const engagedSent = useRef(false);

  useEffect(() => {
    const emit = (event: WorldStatEvent) =>
      sendWorldBeacon({ bookVersionId, ...(entityKey ? { key: entityKey } : {}), event });

    if (!viewSent.current) {
      viewSent.current = true;
      emit('view');
    }

    const root = rootRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      if (e.type === 'auxclick' && e.button !== 1) return;
      const target = e.target instanceof Element ? e.target : null;
      const event = classifyWorldHref(target?.closest('a[href]')?.getAttribute('href'));
      if (!event) return;
      emit(event);
      if (!engagedSent.current) {
        engagedSent.current = true;
        emit('engaged');
      }
    };
    root.addEventListener('click', onClick);
    root.addEventListener('auxclick', onClick);
    return () => {
      root.removeEventListener('click', onClick);
      root.removeEventListener('auxclick', onClick);
    };
  }, [bookVersionId, entityKey]);

  return (
    <div ref={rootRef} className={styles.root}>
      {children}
    </div>
  );
}
