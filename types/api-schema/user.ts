/**
 * Types for User endpoints
 *
 * User profile, settings
 */

import type {
  ISODate,
  PaginatedResult,
  PaginationInfoWithNext,
  RoleName,
  SupportedLang,
  UUID,
} from './common';

/**
 * Ответ сохранения профиля (`PATCH /users/profile`).
 *
 * 🔴 Ролей здесь нет намеренно: `UsersService.updateMe` их не выбирает
 * (`books/src/modules/users/users.service.ts`), и это защита - экран, переписывающий
 * состояние пользователя ответом на сохранение имени, обнулил бы себе роли.
 */
export interface UserProfileResponse {
  id: UUID;
  email: string;
  name?: string | null;
  displayName?: string;
  nickname?: string | null;
  avatarUrl?: string | null;
  languagePreference?: SupportedLang;
  createdAt: ISODate;
}

/**
 * Ответ `GET /users/me` — тот же пользователь, но **с ролями**: на них держится вся
 * разметка прав в интерфейсе.
 */
export interface UserMeResponse {
  id: UUID;
  email: string;
  name?: string | null;
  displayName?: string;
  nickname?: string | null;
  avatarUrl?: string | null;
  languagePreference?: SupportedLang;
  roles: RoleName[];
  createdAt: ISODate;
}

/**
 * Пользователь в админском списке — `PublicUserWithRolesDto` (`GET /users`, `GET /users/:id`).
 *
 * 🔴 Все поля имени сервер отдаёт **всегда**, но со значением `null`, а не пропускает ключ:
 * `?: string` и `string | null` — разные вещи, и первое обещает отсутствие ключа, которого
 * не бывает (`LEGACY-380`). Отображаемого имени в ответе нет вовсе — оно собирается на
 * экране из этих полей (`userDisplayName`), поля `displayName` у сервера не существует.
 * Дата последнего входа зовётся `lastLogin`, а не `lastLoginAt`.
 */
export interface User {
  id: UUID;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  languagePreference: SupportedLang;
  roles: RoleName[];
  isActive: boolean;
  lastLogin: ISODate | null;
  createdAt: ISODate;
}

/**
 * Parameters for fetching users list
 */
export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: RoleName;
  isActive?: boolean;
}

/**
 * Ответ `GET /users` (админский список) — единая обёртка `{items, pagination}`
 * (`LEGACY-177`). До 13.09.2026 `total`, `page` и `limit` лежали рядом с `items`.
 */
export type UsersResponse = PaginatedResult<User>;

/**
 * Request to create a new user
 */
export interface CreateUserRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  roles?: RoleName[];
  isActive?: boolean;
}

/**
 * Request to update a user
 */
export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  password?: string; // Optional for admin reset
  roles?: RoleName[]; // Admin can update roles
}

/**
 * Request to change password
 */
export interface ChangePasswordRequest {
  password: string;
}

// --- Client profile & cabinet types ---

export interface UpdateProfileRequest {
  name?: string;
  nickname?: string;
  avatarUrl?: string;
  languagePreference?: SupportedLang;
}

export interface UserActivityBookVersion {
  id: UUID;
  title: string;
  author: string;
  coverImageUrl: string | null;
  slug: string;
}

export interface UserActivityParentOrChildComment {
  id: UUID;
  text: string;
  createdAt: ISODate;
  // Почты автора здесь нет и быть не должно: `parent.user` — автор чужого
  // комментария, `replies[].user` — те, кто ответил, и то и другое третьи лица.
  // Бэкенд перестал их отдавать в `LEGACY-191`; поле в этом типе жило само по
  // себе — схема написана руками и из бэкенда не генерится.
  user: {
    id: UUID;
    name?: string | null;
    nickname?: string | null;
    avatarUrl?: string | null;
  };
}

// Ответ в ветке. `isHidden: true` приходит только у собственного ответа автора
// под его же скрытым корнем (`LEGACY-366`, решение арбитра 16.09.2026); свои
// скрытые ответы под видимым корнем приходят отдельной записью активности.
export interface UserActivityReply extends UserActivityParentOrChildComment {
  isHidden: boolean;
}

export interface UserActivity {
  id: UUID;
  text: string;
  // Собственный комментарий, скрытый модератором. Запись остаётся в активности
  // автора — иначе модерация неотличима от пропажи данных, — а `replies` под ней
  // сервер сужает до **собственных ответов автора**: публично скрытый корень
  // прячет всю ветку, и ответы третьих лиц автору не показываются, но свой текст
  // у него не отнимается (`LEGACY-212`, поправка арбитра от 04.09.2026; до неё
  // здесь было написано «отдаёт пустым», и это разошлось с кодом бэкенда —
  // `books/src/modules/users/users.service.ts:611-613`).
  isHidden: boolean;
  createdAt: ISODate;
  parentId: UUID | null;
  bookVersion: UserActivityBookVersion | null;
  parent: UserActivityParentOrChildComment | null;
  replies: UserActivityReply[];
}

export interface GetUserActivitiesParams {
  page?: number;
  limit?: number;
}

/**
 * Ответ `GET /users/me/activities` — единая обёртка `{items, pagination}` (`LEGACY-177`).
 *
 * `hasNext` не исчез, а переехал **внутрь** `pagination`: снаружи у списочного ответа
 * теперь только `items` и `pagination`. До 13.09.2026 всё лежало плоско.
 */
export type UserActivitiesResponse = PaginatedResult<UserActivity, PaginationInfoWithNext>;
