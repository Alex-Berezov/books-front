import { describe, it, expect } from 'vitest';
import * as booksEndpoints from '@/api/endpoints/admin/books';
import * as booksHooks from '@/api/hooks/useBooks';

/**
 * WP-10.7 (R2-04): `createBook` → `useCreateBook` бил в `POST /books`, отключённый фазой 6,
 * не вызывался ни одним компонентом и оставался заряженным ружьём: любой новый вызов
 * обошёл бы создание книги из утверждённого интейка прав.
 */

describe('admin books API surface (WP-10.7 / R2-04)', () => {
  it('exposes no direct book-creation endpoint', () => {
    expect(Object.keys(booksEndpoints)).not.toContain('createBook');
  });

  it('exposes no direct book-creation hook', () => {
    expect(Object.keys(booksHooks)).not.toContain('useCreateBook');
  });
});
