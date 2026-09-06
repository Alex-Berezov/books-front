'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Элементы, до которых клавиатура вообще может добраться.
 *
 * `[tabindex="-1"]` в список не входит намеренно: сам контейнер окна получает
 * его, чтобы принять фокус программно, но остановкой табуляции быть не должен.
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * ⚠️ Видимость проверяется атрибутом `hidden`, а не `offsetParent`: раскладки в jsdom
 * нет вовсе, там `offsetParent` всегда `null` — фильтр по нему оставлял бы список
 * пустым, то есть посадка была бы зелёной при неработающем замыкании.
 */
const focusableInside = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      !el.hasAttribute('hidden') &&
      el.closest('[hidden]') === null &&
      !el.hasAttribute('disabled') &&
      el.getAttribute('aria-hidden') !== 'true'
  );

/**
 * Фокус модального окна: забрать при открытии, замкнуть Tab внутри, вернуть при закрытии.
 *
 * 🔴 Заведён по `LEGACY-041`, и каждая из трёх частей закрывает свой отказ.
 *
 * **Забрать.** Окно открывают кнопкой на странице, и фокус остаётся на ней. Обработчик
 * Escape внутри окна в этом случае не вызывается вовсе — событие до него не всплывает.
 *
 * **Замкнуть.** Окно рисуется в общем потоке, поэтому Tab из последней кнопки уходит
 * на страницу под подложкой: посетитель «выпадает» из диалога, продолжая считать, что
 * находится в нём, и Escape перестаёт закрывать окно.
 *
 * **Вернуть.** Иначе после закрытия фокус падает на `body`, и следующий Tab начинает
 * обход страницы с начала — для клавиатуры это потеря места.
 *
 * ⚠️ Слушатель ставится на сам контейнер окна, а не на документ: в App Router корнем
 * React служит `document`, и слушатель на нём получал бы события, уже погашенные
 * `stopPropagation` вложенного виджета (так выпадающий список antd гасит свой Escape).
 */
export const useDialogFocus = (ref: RefObject<HTMLElement | null>, isOpen = true): void => {
  useEffect(() => {
    if (!isOpen) return;

    const dialog = ref.current;
    if (!dialog) return;

    const opener = document.activeElement as HTMLElement | null;
    dialog.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusable = focusableInside(dialog);
      if (focusable.length === 0) {
        // Нечего обходить — держим фокус на самом окне, чтобы Escape продолжал работать.
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener('keydown', onKeyDown);

    return () => {
      dialog.removeEventListener('keydown', onKeyDown);
      opener?.focus?.();
    };
  }, [ref, isOpen]);
};
