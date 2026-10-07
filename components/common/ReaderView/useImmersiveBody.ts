import { useEffect } from 'react';

/**
 * While `enabled`, the reader owns the viewport: the page itself is locked and
 * only the chapter text scrolls, so no second scrollbar hides the reader's bars
 * (`body[data-immersive]` in `styles/globals.css`). One switch for every page
 * that shows `ReaderView` - the public reader and the admin draft preview.
 */
export const useImmersiveBody = (enabled: boolean): void => {
  useEffect(() => {
    if (!enabled) return;
    document.body.dataset.immersive = 'true';
    return () => {
      delete document.body.dataset.immersive;
    };
  }, [enabled]);
};
