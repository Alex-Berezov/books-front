'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useOnOpen } from './useOnOpen';

/**
 * While `isActive`, applies every new `value` until the user edits the field by hand.
 *
 * Used for defaults that come from a live list (the next chapter number): an untouched
 * field follows the refetched list, an edited one is never overwritten, even when the user
 * types back the original value. The edit flag clears each time `isActive` turns on.
 * Returns the callback the field calls from its own `onChange`.
 */
export const useFollowUntilEdited = <T>(
  isActive: boolean,
  value: T,
  apply: (value: T) => void
): (() => void) => {
  const editedRef = useRef(false);
  const applyRef = useRef(apply);
  useEffect(() => {
    applyRef.current = apply;
  });

  useOnOpen(isActive, () => {
    editedRef.current = false;
  });

  useEffect(() => {
    if (isActive && !editedRef.current) applyRef.current(value);
  }, [isActive, value]);

  return useCallback(() => {
    editedRef.current = true;
  }, []);
};
