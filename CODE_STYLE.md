# Code Style Guide - Bibliaris Frontend

> Coding standards for production-ready project

**Version:** 1.5  
**Last Updated:** November 10, 2025

---

## 🎯 Philosophy

We write code that:

- ✅ Is easy to read and understand
- ✅ Scales simply
- ✅ Is type-safe
- ✅ Is production-ready

---

## 📐 General Rules

### 1. TypeScript - strict and no compromises

**✅ CORRECT:**

```typescript
import type { FC, ReactNode } from 'react';
import type { SupportedLang } from '@/lib/i18n/lang';

interface UserCardProps {
  name: string;
  email: string;
  role: 'admin' | 'user';
  onEdit: (id: string) => void;
}

export const UserCard: FC<UserCardProps> = (props) => {
  const { name, email, role, onEdit } = props;
  // ...
};
```

**❌ INCORRECT:**

```typescript
// NO! Never use any
const UserCard = (props: any) => {};

// NO! Use import type for types
import { FC, ReactNode } from 'react';

// NO! React.ReactNode is redundant
const Component = ({ children }: { children: React.ReactNode }) => {};
```

**🚫 FORBIDDEN:**

- `any` - always write specific types
- `@ts-ignore` / `@ts-nocheck` - fix the problem, don't hide it
- `as any` - only with a clear comment explaining why
- Implicit types where they are critical

### 2. Destructure props (3+ parameters)

**✅ CORRECT:**

```typescript
interface BookCardProps {
  title: string;
  author: string;
  coverUrl: string;
  rating: number;
  onRead: () => void;
}

export const BookCard: FC<BookCardProps> = (props) => {
  // Destructure inside the component
  const { title, author, coverUrl, rating, onRead } = props;

  return (
    <div className="book-card">
      {/* ... */}
    </div>
  );
}
```

**❌ INCORRECT:**

```typescript
// Signature is too long - hard to read
export const BookCard: FC<BookCardProps> = ({
  title,
  author,
  coverUrl,
  rating,
  onRead
}) => {
  return <div>...</div>
}
```

### 3. Extract computations from render

**✅ CORRECT:**

```typescript
export const BookPrice: FC<Props> = (props) => {
  const { price, currency, discount } = props;

  // Computations in variables
  const finalPrice = price - (price * discount);
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(finalPrice);

  return <span className="price">{formattedPrice}</span>;
}
```

**❌ INCORRECT:**

```typescript
// Computations in JSX - hard to read
return (
  <span>
    {new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price - (price * discount))}
  </span>
);
```

### 4. Extract event handlers with logic into named functions

**Rule:** Event handlers with logic (2+ lines) must be extracted into named functions.

**✅ CORRECT:**

```typescript
export const PageForm: FC<Props> = (props) => {
  const { watch, setValue } = useForm();

  // Handler for generating canonical URL
  const handleGenerateCanonicalUrl = () => {
    const currentSlug = watch('slug');
    const currentLang = watch('language');

    if (currentSlug && currentLang) {
      setValue(
        'seoCanonicalUrl',
        `https://example.com/${currentLang}/${currentSlug}`
      );
    }
  };

  return (
    <button onClick={handleGenerateCanonicalUrl} type="button">
      Use Current URL
    </button>
  );
};
```

**❌ INCORRECT:**

```typescript
// NO! Logic directly in JSX - hard to read and test
<button
  onClick={() => {
    const currentSlug = watch('slug');
    const currentLang = watch('language');
    if (currentSlug && currentLang) {
      setValue(
        'seoCanonicalUrl',
        `https://example.com/${currentLang}/${currentSlug}`
      );
    }
  }}
  type="button"
>
```

**Acceptable exceptions (inline handlers):**

```typescript
// ✅ OK: Simple call without logic (1 line)
<button onClick={() => setIsOpen(true)}>Open</button>

// ✅ OK: Passing parameter to existing function
<button onClick={() => handleDelete(item.id)}>Delete</button>

// ✅ OK: Preventing event
<a href="#" onClick={(e) => e.preventDefault()}>Link</a>
```

**Why this matters:**

- ✅ Code is easier to read and understand
- ✅ Functions can be reused
- ✅ Easier to test logic
- ✅ Function name describes what it does
- ✅ JSX remains clean and declarative

### 5. Component decomposition - maximum 250 lines

**Rule:** A component should not exceed 250 lines of code. When exceeded - decomposition is mandatory.

**✅ CORRECT:**

```typescript
// ❌ BEFORE: PageForm.tsx (545 lines - monster!)
export const PageForm: FC<PageFormProps> = (props) => {
  // 500+ lines of JSX with repeating patterns
};

// ✅ AFTER: Split into modules

// PageForm.types.ts - schemas and types
export const pageSchema = z.object({...});
export type PageFormData = z.infer<typeof pageSchema>;

// PageForm/BasicInfoSection.tsx (~80 lines)
export const BasicInfoSection: FC<Props> = ({ control, errors }) => (
  <div className={styles.section}>
    {/* language, type, title, slug, content */}
  </div>
);

// PageForm/SeoBasicSection.tsx (~60 lines)
export const SeoBasicSection: FC<Props> = ({ control, errors }) => (
  <SeoCollapsible title="Basic Meta Tags">
    {/* metaTitle, metaDescription */}
  </SeoCollapsible>
);

// PageForm/index.tsx (~100 lines)
export const PageForm: FC<PageFormProps> = (props) => {
  const { handleSubmit, control } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <BasicInfoSection control={control} errors={errors} />
      <SeoBasicSection control={control} errors={errors} />
      <SeoTechnicalSection control={control} errors={errors} />
      <SeoOpenGraphSection control={control} errors={errors} />
      <SeoTwitterSection control={control} errors={errors} />
    </form>
  );
};
```

**Decomposition principles:**

1. **By functionality:** Group related fields (Basic Info, SEO, Metadata)
2. **Reusable UI:** Extract repeating patterns (FormField, CharCounter)
3. **Types separately:** Zod schemas and types in `.types.ts`
4. **One component = one responsibility**

**Structure after decomposition:**

```
components/admin/pages/PageForm/
  ├── index.tsx              (~100 lines - main component)
  ├── PageForm.types.ts      (~50 lines - schemas and types)
  ├── PageForm.module.scss   (styles)
  ├── sections/
  │   ├── BasicInfoSection.tsx      (~80 lines)
  │   ├── SeoBasicSection.tsx       (~60 lines)
  │   ├── SeoTechnicalSection.tsx   (~70 lines)
  │   ├── SeoOpenGraphSection.tsx   (~90 lines)
  │   └── SeoTwitterSection.tsx     (~50 lines)
  └── ui/
      ├── FormField.tsx         (~40 lines - reusable wrapper)
      ├── CharCounter.tsx       (~20 lines - character counter)
      └── SeoCollapsible.tsx    (~30 lines - details/summary)
```

**Why this matters:**

- ✅ Easier to read and understand code
- ✅ Simpler to find needed logic
- ✅ UI component reuse
- ✅ Independent testing of sections
- ✅ Parallel development of different sections

**When to decompose:**

- 🔴 **Mandatory:** Component > 250 lines
- 🟡 **Recommended:** Component > 150 lines with repeating patterns
- ✅ **Can leave:** < 150 lines without duplication

### 6. Exports - only Named Exports with Arrow Functions

**✅ CORRECT:**

```typescript
// utils/formatPrice.ts
export const formatPrice = (price: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price);
};

// Can export multiple functions
export const calculateDiscount = (price: number, percent: number): number => {
  return price - (price * percent) / 100;
};
```

```typescript
// lib/i18n/languageSelectOptions.tsx
export const getLanguageSelectOptions = () => {
  return SUPPORTED_LANGS.map((lang) => ({
    label: <span>{LANGUAGE_FLAGS[lang]} {LANGUAGE_LABELS[lang]}</span>,
    value: lang,
  }));
};
```

**❌ INCORRECT:**

```typescript
// NO! export default makes refactoring harder
export default function formatPrice(price: number) {
  return price.toFixed(2);
}

// NO! Regular function instead of arrow function
export function calculateDiscount(price: number, percent: number) {
  return price * percent;
}
```

**Why `export const` with arrow functions:**

- ✅ Explicit naming on import (cannot rename arbitrarily)
- ✅ Better for tree-shaking
- ✅ More convenient for auto-import in IDE
- ✅ Function name visible in error stack
- ✅ Can export multiple utilities from one file
- ✅ Modern TypeScript/React style

**When `export default` is acceptable:**

- React component pages in Next.js (framework requirement)
- Configuration files (`next.config.js`, `tailwind.config.ts`)

---

## 🎨 Styles - SCSS only

### 1. NO inline styles!

**🚫 CRITICAL RULE:** Inline styles are FORBIDDEN in all components!

**Reasons for the ban:**

- ❌ Impossible to reuse styles
- ❌ Break design consistency
- ❌ Complicate code maintenance
- ❌ Don't work with CSS variables and tokens
- ❌ Scale poorly
- ❌ No autocomplete in IDE

**✅ CORRECT:**

```tsx
// Component.tsx
import styles from './Component.module.scss';

export const Component = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Hello</h1>
    </div>
  );
};
```

```scss
// Component.module.scss
.container {
  display: flex;
  padding: $spacing-md;
  background: $color-background-primary;
}

.title {
  color: $color-text-primary;
  font-size: $font-size-xl;
}
```

**❌ INCORRECT:**

```tsx
// NO! Inline styles are forbidden
<div style={{ padding: '1rem', background: '#fff' }}>
  <h1 style={{ color: '#000' }}>Hello</h1>
</div>

// NO! Even for simple cases
<span style={{ marginLeft: '4px', fontWeight: 'normal' }}>Text</span>

// NO! Even in conditionals
<p style={{ color: error ? '#ff4d4f' : '#666' }}>Message</p>
```

**Acceptable exceptions (only in extreme cases):**

- Dynamic values that cannot be set via CSS (e.g., `transform` based on mouse coordinates)
- Temporary placeholder pages (e.g., loading/error states before adding design)

**In these cases add a comment:**

```tsx
// TODO: Move to SCSS after design finalization
<div style={{ transform: `translate(${x}px, ${y}px)` }}>
```

### 2. Use SCSS features

### 2. Use SCSS features

```scss
// variables.scss - tokens and mixins
$spacing-xs: 0.25rem;
$spacing-sm: 0.5rem;
$spacing-md: 1rem;
$spacing-lg: 1.5rem;
$spacing-xl: 2rem;

// Mixins for reuse
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

@mixin card-shadow {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

// Component.module.scss
@import '@/styles/variables';

.container {
  @include flex-center;
  @include card-shadow;
  padding: $spacing-lg;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .title {
    color: $color-text-primary;
  }
}
```

---

## 🎨 Design Tokens - single source of truth

### 1. Colors always from tokens

```scss
// styles/tokens/colors.scss
// Project color palette

// Primary Colors
$color-primary: #1890ff;
$color-primary-hover: #40a9ff;
$color-primary-active: #096dd9;
$color-primary-disabled: #d9d9d9;

// Semantic Colors
$color-success: #52c41a;
$color-warning: #faad14;
$color-error: #ff4d4f;
$color-info: #1890ff;

// Background Colors
$color-background-primary: #ffffff;
$color-background-secondary: #f0f0f0;
$color-background-dark: #001529;

// Text Colors
$color-text-primary: #000000;
$color-text-secondary: #666666;
$color-text-disabled: #999999;
$color-text-inverse: #ffffff;

// Border Colors
$color-border-light: #f0f0f0;
$color-border-base: #d9d9d9;
$color-border-dark: #434343;

// Shadows
$shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
$shadow-md: 0 4px 12px rgba(0, 0, 0, 0.12);
$shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.16);
```

```typescript
// styles/tokens/colors.ts - for use in TypeScript
export const colors = {
  primary: '#1890ff',
  primaryHover: '#40a9ff',
  primaryActive: '#096dd9',

  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  info: '#1890ff',

  backgroundPrimary: '#ffffff',
  backgroundSecondary: '#f0f0f0',
  backgroundDark: '#001529',

  textPrimary: '#000000',
  textSecondary: '#666666',
  textDisabled: '#999999',
  textInverse: '#ffffff',
} as const;

export type ColorToken = keyof typeof colors;
```

### 2. Spacing tokens

```scss
// styles/tokens/spacing.scss
$spacing-xs: 0.25rem; // 4px
$spacing-sm: 0.5rem; // 8px
$spacing-md: 1rem; // 16px
$spacing-lg: 1.5rem; // 24px
$spacing-xl: 2rem; // 32px
$spacing-xxl: 3rem; // 48px
```

### 3. Typography tokens

```scss
// styles/tokens/typography.scss
// Font Families
$font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
$font-family-mono: 'SF Mono', Monaco, monospace;

// Font Sizes
$font-size-xs: 0.75rem; // 12px
$font-size-sm: 0.875rem; // 14px
$font-size-md: 1rem; // 16px
$font-size-lg: 1.125rem; // 18px
$font-size-xl: 1.5rem; // 24px
$font-size-xxl: 2rem; // 32px

// Font Weights
$font-weight-regular: 400;
$font-weight-medium: 500;
$font-weight-semibold: 600;
$font-weight-bold: 700;

// Line Heights
$line-height-tight: 1.2;
$line-height-normal: 1.5;
$line-height-relaxed: 1.75;
```

### 4. Breakpoints for responsive design

```scss
// styles/tokens/breakpoints.scss
$breakpoint-xs: 480px;
$breakpoint-sm: 768px;
$breakpoint-md: 1024px;
$breakpoint-lg: 1280px;
$breakpoint-xl: 1536px;

// Mixins for media queries
@mixin mobile {
  @media (max-width: $breakpoint-sm - 1) {
    @content;
  }
}

@mixin tablet {
  @media (min-width: $breakpoint-sm) and (max-width: $breakpoint-md - 1) {
    @content;
  }
}

@mixin desktop {
  @media (min-width: $breakpoint-md) {
    @content;
  }
}
```

---

## 📝 Comments - in English

```typescript
/**
 * Book card component
 * Displays cover, title, author and rating
 *
 * @param props - Component props
 */
export const BookCard: FC<BookCardProps> = (props) => {
  const { title, author, coverUrl, rating } = props;

  // Format rating for display
  const formattedRating = rating.toFixed(1);

  // Click handler for the card
  const handleClick = () => {
    // Handle logic
  };

  return (
    <div className={styles.card}>
      {/* Book cover */}
      <img src={coverUrl} alt={title} />

      {/* Book information */}
      <div className={styles.info}>
        <h3>{title}</h3>
        <p>{author}</p>
      </div>
    </div>
  );
}
```

---

## 📁 Component file structure

```
components/
└── BookCard/
    ├── BookCard.tsx          # Main component
    ├── BookCard.module.scss  # Component styles
    ├── BookCard.types.ts     # Types and interfaces
    ├── BookCard.test.tsx     # Tests (future)
    └── index.ts              # Re-export
```

```typescript
// BookCard.types.ts
export interface BookCardProps {
  title: string;
  author: string;
  coverUrl: string;
  rating: number;
  onRead: () => void;
}

// index.ts
export { BookCard } from './BookCard';
export type { BookCardProps } from './BookCard.types';
```

---

## 🔧 Best Practices

### 1. Naming

```typescript
// Components - PascalCase
export const UserProfile = () => { }

// Functions and variables - camelCase
const handleClick = () => { }
const userName = 'John';

// Constants - UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRY_COUNT = 3;

// Types and interfaces - PascalCase
interface UserData { }
type ApiResponse = { }

// CSS classes - kebab-case
.user-profile { }
.book-card { }
```

### 2. Import organization

**⚠️ IMPORTANT:** Import order is automatically checked by ESLint!

```typescript
// 1. React and libraries
import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useRouter } from 'next/navigation';

// 2. UI libraries
import { Button, Input } from 'antd';

// 3. Internal components
import { UserCard } from '@/components/UserCard';
import { Layout } from '@/components/Layout';

// 4. Utilities and hooks
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/utils';

// 5. Types
import type { User } from '@/types/user';
import type { ApiResponse } from '@/types/api';

// 6. Styles (always last)
import styles from './Component.module.scss';
```

**ESLint settings:**

- `import/order` rule automatically checks order
- `@typescript-eslint/consistent-type-imports` requires `import type`
- Imports are sorted alphabetically within groups
- Styles always at the end of file

### 3. Hooks - usage rules

```typescript
export const UserProfile: FC<Props> = (props) => {
  // 1. All hooks at the beginning, in correct order
  const router = useRouter();
  const { user } = useAuth();

  // 2. State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 3. Memoization
  const fullName = useMemo(() => {
    return `${user.firstName} ${user.lastName}`;
  }, [user.firstName, user.lastName]);

  // 4. Effects
  useEffect(() => {
    // Effect logic
  }, []);

  // 5. Handlers
  const handleSave = useCallback(() => {
    // Save logic
  }, []);

  // 6. Computations and variables
  const { id, email } = props;
  const isAdmin = user.role === 'admin';

  // 7. Render
  return <div>...</div>;
}
```

### 4. Conditional rendering

```typescript
// ✅ CORRECT: Early return for simple conditions
if (isLoading) {
  return <Spinner />;
}

if (error) {
  return <ErrorMessage message={error} />;
}

return <Content />;

// ✅ CORRECT: Ternary operator for simple conditions
return (
  <div>
    {isVisible ? <Content /> : <Placeholder />}
  </div>
);

// ✅ CORRECT: && for optional render
return (
  <div>
    {isAdmin && <AdminPanel />}
  </div>
);

// ❌ INCORRECT: Complex nesting in JSX
return (
  <div>
    {isLoading ? (
      <Spinner />
    ) : error ? (
      <Error />
    ) : data ? (
      <Content />
    ) : (
      <Empty />
    )}
  </div>
);
```

### 5. Error handling

```typescript
export const DataFetcher: FC<Props> = (props) => {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.getData();
      setData(response);
    } catch (err) {
      // Proper error typing
      const error = err instanceof Error ? err : new Error('Unknown error');

      setError(error);
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ...
};
```

### 6. Performance

```typescript
// ✅ Memoize expensive computations
const sortedBooks = useMemo(() => {
  return books.sort((a, b) => b.rating - a.rating);
}, [books]);

// ✅ Memoize callbacks
const handleDelete = useCallback(
  (id: string) => {
    onDelete(id);
  },
  [onDelete]
);

// ✅ React.memo for pure components
export const BookCard = memo<BookCardProps>((props) => {
  // ...
});
```

---

## 🔢 Constants and Magic Numbers

### 1. Extract all magic numbers into constants

**✅ CORRECT:**

```typescript
// lib/auth/constants.ts
export const AUTH_TOKEN_EXPIRY = {
  /** Access token is valid for 12 hours (in milliseconds) */
  ACCESS_TOKEN_MS: 12 * 60 * 60 * 1000,

  /** Refresh token is valid for 7 days (in seconds) */
  REFRESH_TOKEN_SECONDS: 7 * 24 * 60 * 60,
} as const;

// lib/auth/config.ts
import { AUTH_TOKEN_EXPIRY } from './constants';

export const authOptions = {
  session: {
    maxAge: AUTH_TOKEN_EXPIRY.REFRESH_TOKEN_SECONDS,
  },
};
```

**❌ INCORRECT:**

```typescript
// NO! Magic numbers without explanation
session: {
  maxAge: 7 * 24 * 60 * 60, // What is this? Not obvious!
}

// NO! Hardcoded in code
if (Date.now() > token.exp + 12 * 60 * 60 * 1000) {
  // Unclear what this number is
}
```

### 2. Enum instead of string literals

**✅ CORRECT:**

```typescript
// constants/auth.ts
export enum AuthErrorType {
  REFRESH_TOKEN_ERROR = 'RefreshAccessTokenError',
  INVALID_CREDENTIALS = 'InvalidCredentials',
  RATE_LIMIT_EXCEEDED = 'RateLimitExceeded',
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  CONTENT_MANAGER = 'content_manager',
}

// Usage
interface Session {
  error?: AuthErrorType; // Strictly typed
}

const isAdmin = user.role === UserRole.ADMIN; // Autocomplete in IDE
```

**❌ INCORRECT:**

```typescript
// NO! String literals
interface Session {
  error?: 'RefreshAccessTokenError' | 'InvalidCredentials'; // Verbose
}

// NO! Can make typos
const isAdmin = user.role === 'admin'; // No autocomplete
```

### 3. Group related constants

**✅ CORRECT:**

```typescript
// constants/routes.ts
export const AUTH_ROUTES = {
  SIGN_IN: '/en/auth/sign-in',
  SIGN_OUT: '/en/auth/sign-out',
  ERROR: '/en/auth/error',
  REGISTER: '/en/auth/register',
} as const;

export const ADMIN_ROUTES = {
  DASHBOARD: '/admin/:lang/dashboard',
  BOOKS: '/admin/:lang/books',
  USERS: '/admin/:lang/users',
} as const;

// Usage
redirect(AUTH_ROUTES.SIGN_IN);
```

**❌ INCORRECT:**

```typescript
// NO! Scattered strings throughout code
redirect('/en/auth/sign-in'); // Hardcoded
redirect('/en/auth/sign-out'); // Duplication
redirect('/en/auth/error'); // Easy to make typos
```

### 4. Error messages

**✅ CORRECT:**

```typescript
// constants/messages.ts
export const AUTH_ERROR_MESSAGES = {
  [AuthErrorType.INVALID_CREDENTIALS]: 'Invalid credentials',
  [AuthErrorType.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later.',
  [AuthErrorType.MISSING_CREDENTIALS]: 'Email and password are required',
} as const;

// Usage
throw new Error(AUTH_ERROR_MESSAGES[AuthErrorType.INVALID_CREDENTIALS]);
```

**❌ INCORRECT:**

```typescript
// NO! Hardcoded messages
throw new Error('Invalid credentials'); // Can make typos
throw new Error('invalid credentials'); // Different casing
throw new Error('Invalid creds'); // Different wording
```

### 5. Constant arrays with `as const`

**✅ CORRECT:**

```typescript
// constants/roles.ts
export const STAFF_ROLES = [UserRole.ADMIN, UserRole.CONTENT_MANAGER] as const;

export type StaffRole = (typeof STAFF_ROLES)[number]; // 'admin' | 'content_manager'

// Usage with type safety
const isStaff = (role: string): role is StaffRole => {
  return STAFF_ROLES.includes(role as UserRole);
};
```

**❌ INCORRECT:**

```typescript
// NO! Without as const loses precise typing
const STAFF_ROLES = [UserRole.ADMIN, UserRole.CONTENT_MANAGER]; // string[]

// NO! Hardcoded array
const staffRoles = ['admin', 'content_manager']; // Can make typos
```

---

## Checklist before commit

- [ ] ✅ `yarn typecheck` passes without errors
- [ ] ✅ `yarn lint` passes without errors
- [ ] ✅ No inline styles
- [ ] ✅ All colors from tokens
- [ ] ✅ No `any` types
- [ ] ✅ Comments in English
- [ ] ✅ Imports properly organized
- [ ] ✅ `import type` for types
- [ ] ✅ Destructuring for 3+ props
- [ ] ✅ Computations extracted from render
- [ ] ✅ Event handlers with logic extracted into functions
- [ ] ✅ Magic numbers extracted into constants
- [ ] ✅ Using enums instead of string literals
- [ ] ✅ Named exports for all utilities

---

## 📚 Additional recommendations

### Unused parameters - use `_` prefix

**✅ CORRECT:**

```typescript
// If parameter is not used, but required for signature
try {
  data = await response.json();
} catch (_error) {
  // Variable not used, but catch requires parameter
  throw new ApiError({
    message: 'Parse error',
    statusCode: 500,
  });
}

// In callback functions
array.map((_item, index) => {
  // Using only index, but map passes item first
  return index;
});

// In event handlers
const handleClick = (_event: React.MouseEvent) => {
  // Event not used, but typing required
  doSomething();
};
```

**❌ INCORRECT:**

```typescript
// NO! ESLint warns about unused variable
try {
  data = await response.json();
} catch (error) {
  // error declared but not used - warning
  throw new ApiError({
    message: 'Parse error',
  });
}
```

### Accessibility (a11y)

```tsx
// Always add aria-label for interactive elements
<button
  aria-label="Close modal"
  onClick={handleClose}
>
  ×
</button>

// Semantic markup
<nav aria-label="Main navigation">
  <ul>...</ul>
</nav>
```

### Performance

```typescript
// Use dynamic import for code splitting
const AdminPanel = dynamic(() => import('@/components/AdminPanel'), {
  loading: () => <Spinner />,
  ssr: false,
});
```

### SEO

```typescript
// Always fill metadata
export const metadata: Metadata = {
  title: 'Book Page',
  description: 'Book description for SEO',
  openGraph: {
    title: 'Book Page',
    description: 'Book description for social media',
  },
};
```

---

## 🔧 ESLint Settings

### Automatic code checks

The project is configured with the following ESLint rules:

**1. Import order (`import/order`)**

- Automatically checks correct import order
- Groups: React/libraries → internal → types → styles
- Sorts alphabetically within each group
- Level: `warn` (warning)

**2. Type imports (`@typescript-eslint/consistent-type-imports`)**

- Requires using `import type` for types
- Helps with tree-shaking and readability
- Level: `warn` (warning)

**3. Unused variables (`@typescript-eslint/no-unused-vars`)**

- Forbids unused variables
- Allows variables with `_` prefix (e.g., `_error`)
- Level: `error` (error)

### Code check before commit

```bash
# Check TypeScript
yarn typecheck

# Check ESLint
yarn lint

# Auto-fix (where possible)
yarn lint --fix
```

---

**Next update:** As new practices emerge
