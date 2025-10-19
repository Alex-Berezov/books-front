/**
 * Публичный API модуля авторизации
 *
 * Экспортирует все необходимые функции и компоненты для работы с NextAuth
 */

// Основные функции авторизации
export { auth, signIn, signOut } from './auth';

// Конфигурация
export { authOptions, refreshAccessToken } from './config';

// Провайдер для клиентских компонентов
export { SessionProvider } from './SessionProvider';

// Вспомогательные функции для серверных компонентов
export { getCurrentUser, isAuthenticated, hasRole, isStaff } from './helpers';

// Константы и типы
export {
  AUTH_TOKEN_EXPIRY,
  AuthErrorType,
  AUTH_ERROR_MESSAGES,
  UserRole,
  STAFF_ROLES,
  AUTH_ROUTES,
} from './constants';
