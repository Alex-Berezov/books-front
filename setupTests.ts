import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { server } from './__tests__/msw/server';

configure({ asyncUtilTimeout: 5000 });

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ---- jsdom shims for the audio feature ----------------------------------

// HTMLMediaElement methods (jsdom leaves these unimplemented).
if (typeof HTMLMediaElement !== 'undefined') {
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn(() => Promise.resolve()),
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'load', {
    configurable: true,
    value: vi.fn(),
  });
}

// URL.createObjectURL / revokeObjectURL are not available in jsdom.
if (typeof globalThis.URL !== 'undefined' && !globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
  globalThis.URL.revokeObjectURL = vi.fn();
}

// Range measurement (required by ProseMirror, which backs the rich text editor).
// ProseMirror keeps the caret in view by measuring the document, and jsdom has
// no layout engine - `Range.prototype.getClientRects` is simply absent, so every
// editor transaction throws `target.getClientRects is not a function`. Empty
// boxes are the honest answer here: the editor tests assert on emitted HTML,
// never on coordinates.
if (typeof Range !== 'undefined') {
  const emptyRect = {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  } as DOMRect;

  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = function getClientRects() {
      return Object.assign([], {
        item: () => null,
      }) as unknown as DOMRectList;
    };
  }

  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = () => emptyRect;
  }
}

// `document.elementFromPoint` (also required by ProseMirror). A mousedown in the
// editor makes it ask which node sits under the pointer; jsdom does not
// implement the method at all, and the resulting TypeError escapes as an
// unhandled error that fails the whole run even while every test passes.
// Returning null is the honest answer without layout: ProseMirror falls back to
// its own position lookup.
if (typeof document !== 'undefined' && !document.elementFromPoint) {
  document.elementFromPoint = () => null;
}

// ResizeObserver (used by Ant Design and various hooks).
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// matchMedia (required by Ant Design).
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}
