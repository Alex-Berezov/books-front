'use client';

import { useEffect, useRef } from 'react';

/**
 * Calls `onOpen` when a dialog opens, and again when `key` changes while it stays open.
 *
 * Form dialogs reset their fields here instead of in an effect keyed on `isOpen` and the
 * default values: a default that changes while the dialog is open (a refetched list) must
 * not wipe what the user has typed. `key` names what the dialog edits (an entity id), so
 * switching to another entity still resets. `onOpen` reads the values current at that moment.
 */
export const useOnOpen = (isOpen: boolean, onOpen: () => void, key?: string | number): void => {
  const onOpenRef = useRef(onOpen);
  useEffect(() => {
    onOpenRef.current = onOpen;
  });

  useEffect(() => {
    if (isOpen) onOpenRef.current();
  }, [isOpen, key]);
};
