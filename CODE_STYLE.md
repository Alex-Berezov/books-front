# Code Style Guide - Bibliaris Frontend

> Стандарты кодирования для production-ready проекта

**Версия:** 1.0  
**Дата обновления:** 19 октября 2025

---

## 🎯 Философия

Мы пишем код, который:

- ✅ Легко читается и понимается
- ✅ Просто масштабируется
- ✅ Безопасен по типам
- ✅ Готов к production

---

## 📐 Общие правила

### 1. TypeScript - строго и без компромиссов

**✅ ПРАВИЛЬНО:**

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

**❌ НЕПРАВИЛЬНО:**

```typescript
// НЕТ! Никогда не используем any
const UserCard = (props: any) => {};

// НЕТ! Используем import type для типов
import { FC, ReactNode } from 'react';

// НЕТ! React.ReactNode - избыточно
const Component = ({ children }: { children: React.ReactNode }) => {};
```

**🚫 ЗАПРЕЩЕНО:**

- `any` - всегда пишем конкретные типы
- `@ts-ignore` / `@ts-nocheck` - исправляем проблему, а не скрываем
- `as any` - только с четким комментарием почему
- Неявные типы там, где они критичны

### 2. Деструктуризация props (3+ параметра)

**✅ ПРАВИЛЬНО:**

```typescript
interface BookCardProps {
  title: string;
  author: string;
  coverUrl: string;
  rating: number;
  onRead: () => void;
}

export const BookCard: FC<BookCardProps> = (props) => {
  // Деструктурируем внутри компонента
  const { title, author, coverUrl, rating, onRead } = props;

  return (
    <div className="book-card">
      {/* ... */}
    </div>
  );
}
```

**❌ НЕПРАВИЛЬНО:**

```typescript
// Слишком длинная сигнатура - плохо читается
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

### 3. Вычисления выносим из рендера

**✅ ПРАВИЛЬНО:**

```typescript
export const BookPrice: FC<Props> = (props) => {
  const { price, currency, discount } = props;

  // Вычисления в переменных
  const finalPrice = price - (price * discount);
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(finalPrice);

  return <span className="price">{formattedPrice}</span>;
}
```

**❌ НЕПРАВИЛЬНО:**

```typescript
// Вычисления в JSX - плохо читается
return (
  <span>
    {new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price - (price * discount))}
  </span>
);
```

### 4. Экспорты - только Named Exports с Arrow Functions

**✅ ПРАВИЛЬНО:**

```typescript
// utils/formatPrice.ts
export const formatPrice = (price: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price);
};

// Можно экспортировать несколько функций
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

**❌ НЕПРАВИЛЬНО:**

```typescript
// НЕТ! export default затрудняет рефакторинг
export default function formatPrice(price: number) {
  return price.toFixed(2);
}

// НЕТ! Обычная функция вместо arrow function
export function calculateDiscount(price: number, percent: number) {
  return price * percent;
}
```

**Почему `export const` с arrow functions:**

- ✅ Явное именование при импорте (нельзя переименовать произвольно)
- ✅ Лучше для tree-shaking
- ✅ Удобнее для автоимпорта в IDE
- ✅ Имя функции видно в стеке ошибок
- ✅ Можно экспортировать несколько утилит из одного файла
- ✅ Современный TypeScript/React стиль

**Когда `export default` допустим:**

- React-компоненты страниц в Next.js (требование фреймворка)
- Конфигурационные файлы (`next.config.js`, `tailwind.config.ts`)

---

## 🎨 Стили - только SCSS

### 1. НЕТ inline-стилям!

**✅ ПРАВИЛЬНО:**

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
  padding: $spacing-lg;
  background: $color-background-primary;
}

.title {
  color: $color-text-primary;
  font-size: $font-size-xl;
}
```

**❌ НЕПРАВИЛЬНО:**

```tsx
// НЕТ! Inline стили запрещены
<div style={{ padding: '1rem', background: '#fff' }}>
  <h1 style={{ color: '#000' }}>Hello</h1>
</div>
```

### 2. Используем SCSS возможности

```scss
// variables.scss - токены и миксины
$spacing-xs: 0.25rem;
$spacing-sm: 0.5rem;
$spacing-md: 1rem;
$spacing-lg: 1.5rem;
$spacing-xl: 2rem;

// Миксины для переиспользования
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

## 🎨 Design Tokens - единый источник истины

### 1. Цвета всегда из токенов

```scss
// styles/tokens/colors.scss
// Палитра цветов проекта

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
// styles/tokens/colors.ts - для использования в TypeScript
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

### 2. Spacing токены

```scss
// styles/tokens/spacing.scss
$spacing-xs: 0.25rem; // 4px
$spacing-sm: 0.5rem; // 8px
$spacing-md: 1rem; // 16px
$spacing-lg: 1.5rem; // 24px
$spacing-xl: 2rem; // 32px
$spacing-xxl: 3rem; // 48px
```

### 3. Typography токены

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

### 4. Breakpoints для адаптива

```scss
// styles/tokens/breakpoints.scss
$breakpoint-xs: 480px;
$breakpoint-sm: 768px;
$breakpoint-md: 1024px;
$breakpoint-lg: 1280px;
$breakpoint-xl: 1536px;

// Миксины для media queries
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

## 📝 Комментарии - на русском

```typescript
/**
 * Компонент карточки книги
 * Отображает обложку, название, автора и рейтинг
 *
 * @param props - Пропсы компонента
 */
export const BookCard: FC<BookCardProps> = (props) => {
  const { title, author, coverUrl, rating } = props;

  // Форматируем рейтинг для отображения
  const formattedRating = rating.toFixed(1);

  // Обработчик клика по карточке
  const handleClick = () => {
    // Логика обработки
  };

  return (
    <div className={styles.card}>
      {/* Обложка книги */}
      <img src={coverUrl} alt={title} />

      {/* Информация о книге */}
      <div className={styles.info}>
        <h3>{title}</h3>
        <p>{author}</p>
      </div>
    </div>
  );
}
```

---

## 📁 Структура файлов компонента

```
components/
└── BookCard/
    ├── BookCard.tsx          # Основной компонент
    ├── BookCard.module.scss  # Стили компонента
    ├── BookCard.types.ts     # Типы и интерфейсы
    ├── BookCard.test.tsx     # Тесты (в будущем)
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

### 1. Именование

```typescript
// Компоненты - PascalCase
export const UserProfile = () => { }

// Функции и переменные - camelCase
const handleClick = () => { }
const userName = 'John';

// Константы - UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRY_COUNT = 3;

// Типы и интерфейсы - PascalCase
interface UserData { }
type ApiResponse = { }

// CSS классы - kebab-case
.user-profile { }
.book-card { }
```

### 2. Организация импортов

```typescript
// 1. React и библиотеки
import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useRouter } from 'next/navigation';

// 2. UI библиотеки
import { Button, Input } from 'antd';

// 3. Внутренние компоненты
import { UserCard } from '@/components/UserCard';
import { Layout } from '@/components/Layout';

// 4. Утилиты и хуки
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/utils';

// 5. Типы
import type { User } from '@/types/user';
import type { ApiResponse } from '@/types/api';

// 6. Стили (всегда последними)
import styles from './Component.module.scss';
```

### 3. Хуки - правила использования

```typescript
export const UserProfile: FC<Props> = (props) => {
  // 1. Все хуки в начале, в правильном порядке
  const router = useRouter();
  const { user } = useAuth();

  // 2. State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 3. Мемоизация
  const fullName = useMemo(() => {
    return `${user.firstName} ${user.lastName}`;
  }, [user.firstName, user.lastName]);

  // 4. Effects
  useEffect(() => {
    // Логика эффекта
  }, []);

  // 5. Обработчики
  const handleSave = useCallback(() => {
    // Логика сохранения
  }, []);

  // 6. Вычисления и переменные
  const { id, email } = props;
  const isAdmin = user.role === 'admin';

  // 7. Рендер
  return <div>...</div>;
}
```

### 4. Условный рендеринг

```typescript
// ✅ ПРАВИЛЬНО: Early return для простых условий
if (isLoading) {
  return <Spinner />;
}

if (error) {
  return <ErrorMessage message={error} />;
}

return <Content />;

// ✅ ПРАВИЛЬНО: Тернарный оператор для простых условий
return (
  <div>
    {isVisible ? <Content /> : <Placeholder />}
  </div>
);

// ✅ ПРАВИЛЬНО: && для опционального рендера
return (
  <div>
    {isAdmin && <AdminPanel />}
  </div>
);

// ❌ НЕПРАВИЛЬНО: Сложная вложенность в JSX
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

### 5. Обработка ошибок

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
      // Правильная типизация ошибки
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

### 6. Производительность

```typescript
// ✅ Мемоизация дорогих вычислений
const sortedBooks = useMemo(() => {
  return books.sort((a, b) => b.rating - a.rating);
}, [books]);

// ✅ Мемоизация колбэков
const handleDelete = useCallback(
  (id: string) => {
    onDelete(id);
  },
  [onDelete]
);

// ✅ React.memo для чистых компонентов
export const BookCard = memo<BookCardProps>((props) => {
  // ...
});
```

---

## 🚀 Checklist перед коммитом

- [ ] ✅ `yarn typecheck` проходит без ошибок
- [ ] ✅ `yarn lint` проходит без ошибок
- [ ] ✅ Нет inline стилей
- [ ] ✅ Все цвета из токенов
- [ ] ✅ Нет `any` типов
- [ ] ✅ Комментарии на русском
- [ ] ✅ Импорты правильно организованы
- [ ] ✅ `import type` для типов
- [ ] ✅ Деструктуризация для 3+ props
- [ ] ✅ Вычисления вынесены из рендера

---

## 📚 Дополнительные рекомендации

### Accessibility (a11y)

```tsx
// Всегда добавляем aria-label для интерактивных элементов
<button
  aria-label="Закрыть модальное окно"
  onClick={handleClose}
>
  ×
</button>

// Семантическая разметка
<nav aria-label="Основная навигация">
  <ul>...</ul>
</nav>
```

### Performance

```typescript
// Используем dynamic import для code splitting
const AdminPanel = dynamic(() => import('@/components/AdminPanel'), {
  loading: () => <Spinner />,
  ssr: false,
});
```

### SEO

```typescript
// Всегда заполняем метаданные
export const metadata: Metadata = {
  title: 'Страница книги',
  description: 'Описание книги для SEO',
  openGraph: {
    title: 'Страница книги',
    description: 'Описание книги для соцсетей',
  },
};
```

---

**Версия:** 1.0  
**Следующее обновление:** По мере появления новых практик
