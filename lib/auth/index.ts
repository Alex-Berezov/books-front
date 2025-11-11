/**
 * Public API of authorization module
 *
 * Exports all necessary functions and components for working with NextAuth
 */

// Main authorization functions
export { auth, signIn, signOut } from './auth';

// Configuration
export { authOptions, refreshAccessToken } from './config';

// Provider for client components
export { SessionProvider } from './SessionProvider';

// Helper functions for server components
export { getCurrentUser, isAuthenticated, hasRole, isStaff } from './helpers';

// Constants and types
export {
  AUTH_TOKEN_EXPIRY,
  AuthErrorType,
  AUTH_ERROR_MESSAGES,
  UserRole,
  STAFF_ROLES,
  AUTH_ROUTES,
} from './constants';
