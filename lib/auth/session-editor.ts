import { STAFF_ROLES } from '@/lib/auth/constants';

const STAFF_ROLE_VALUES: readonly string[] = STAFF_ROLES;

/** То, что нужно от `useSession()`: статус и сессия с ролями и ошибкой обновления токена. */
export interface SessionLike {
  status: 'loading' | 'authenticated' | 'unauthenticated';
  data: { error?: unknown; user?: { roles?: string[] } } | null | undefined;
}

/**
 * Редактор ли сессия (`admin` или `content_manager`) — для вкладок, закрытых остальным ролям
 * (World F08-1). Сессия грузится — `null`: решения ещё нет. Сессия с ошибкой обновления токена
 * правом не считается (L-010): запрос с протухшим токеном выбросил бы на форму входа.
 */
export const sessionEditorState = ({ status, data }: SessionLike): boolean | null => {
  if (status === 'loading') return null;
  if (status !== 'authenticated' || data?.error) return false;
  return (data?.user?.roles ?? []).some((role) => STAFF_ROLE_VALUES.includes(role));
};
