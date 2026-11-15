import { describe, expect, it } from 'vitest';
import { sessionEditorState } from '@/lib/auth/session-editor';

/** F08-1: вкладка World — только редакторам; решение по сессии страницы версии. */

describe('sessionEditorState', () => {
  it('the session is loading — no decision yet (spinner)', () => {
    expect(sessionEditorState({ status: 'loading', data: undefined })).toBeNull();
  });

  it.each([
    [['admin'], true],
    [['content_manager'], true],
    [['lawyer'], false],
    [['user'], false],
    [[], false],
  ])('roles %j → editor %s', (roles, expected) => {
    expect(sessionEditorState({ status: 'authenticated', data: { user: { roles } } })).toBe(
      expected
    );
  });

  it('a session with a token refresh error is not an editor (stub), whatever the roles', () => {
    expect(
      sessionEditorState({
        status: 'authenticated',
        data: { error: 'RefreshAccessTokenError', user: { roles: ['admin'] } },
      })
    ).toBe(false);
  });

  it('no session — not an editor', () => {
    expect(sessionEditorState({ status: 'unauthenticated', data: null })).toBe(false);
  });
});
