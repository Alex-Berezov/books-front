# Swagger для разработки фронтенда

## 🎯 Цель

Вам нужен доступ к Swagger для разработки фронтенда. Есть несколько способов в зависимости от ваших задач.

## 🚀 Способ 1: Временное включение на production (самый быстрый)

### Когда использовать:

- Нужно посмотреть актуальную схему API
- Протестировать endpoints в Swagger UI
- Быстро проверить структуру данных

### Шаги:

```bash
# 1. SSH на сервер
ssh deploy@bibliaris.com

# 2. Включить Swagger
cd /opt/books/app/src
./scripts/toggle_swagger.sh enable

# Вывод:
# ✅ SWAGGER_ENABLED=1 установлен в .env.prod
# 🔄 Перезапуск приложения...
# ✅ Swagger включен!
# 📍 URL: https://bibliaris.com/docs
# 📍 JSON: https://bibliaris.com/docs-json
# ⚠️  НЕ ЗАБУДЬТЕ ОТКЛЮЧИТЬ после использования
```

### 3. Открыть в браузере:

- **Swagger UI**: https://bibliaris.com/docs
- **OpenAPI JSON**: https://bibliaris.com/docs-json

### 4. ⚠️ ВАЖНО - Отключить после использования:

```bash
# На сервере
./scripts/toggle_swagger.sh disable
```

### ⏱️ Время: ~30 секунд

---

## 📦 Способ 2: Генерация TypeScript типов (рекомендуется для постоянной работы)

### Когда использовать:

- Нужны типы для TypeScript
- Хотите работать с типизацией в IDE
- Не хотите каждый раз включать Swagger на production

### Одноразовая настройка:

```bash
# В backend репозитории (books-app-back)
cd /path/to/books-app-back

# Генерация типов из production API
yarn openapi:types:prod

# Или из локального API (если запущен)
yarn openapi:types
```

### Результат:

Создастся файл `libs/api-client/types.ts` с полными TypeScript типами:

```typescript
// libs/api-client/types.ts
export interface Book {
  id: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookDto {
  slug: string;
}

// ... и так далее
```

### Использование во фронтенде:

```typescript
// В вашем фронтенд проекте
import type { Book, CreateBookDto } from '@/types/api';

// Или скопируйте types.ts в ваш фронтенд проект
```

### Автоматическая генерация при изменениях:

Добавьте в ваш фронтенд проект скрипт:

```json
// package.json
{
  "scripts": {
    "types:update": "curl https://bibliaris.com/docs-json -o openapi.json && npx openapi-typescript openapi.json -o types/api.ts"
  }
}
```

Запускайте когда API изменился:

```bash
yarn types:update
```

### ⏱️ Время: ~5 секунд (после первой настройки - 1 команда)

---

## 🏠 Способ 3: Локальный backend с включенным Swagger

### Когда использовать:

- Активная разработка с частыми изменениями API
- Нужен полный контроль
- Хотите тестировать изменения до деплоя

### Шаги:

```bash
# 1. Клонируйте backend (если еще не сделали)
git clone https://github.com/Alex-Berezov/books.git books-app-back
cd books-app-back

# 2. Установите зависимости
yarn

# 3. Настройте .env
cp .env.example .env
# Отредактируйте DATABASE_URL под вашу локальную БД

# 4. Примените миграции
yarn prisma:generate
yarn prisma:migrate
yarn prisma:seed

# 5. Запустите в dev режиме (Swagger включен автоматически)
yarn start:dev
```

### Swagger доступен локально:

- **Swagger UI**: http://localhost:5000/docs
- **OpenAPI JSON**: http://localhost:5000/docs-json

### Настройте фронтенд для локального API:

```typescript
// Frontend config
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
```

### ⏱️ Время: ~5 минут (одноразово)

---

## 🔄 Способ 4: RTK Query CodeGen (для React + RTK Query)

### Когда использовать:

- Используете Redux Toolkit Query
- Хотите автоматическую генерацию хуков
- Нужна полная типизация + кэширование

### Установка:

```bash
# В вашем фронтенд проекте
yarn add -D @rtk-query/codegen-openapi
```

### Настройка:

```typescript
// openapi-config.ts
import type { ConfigFile } from '@rtk-query/codegen-openapi';

const config: ConfigFile = {
  schemaFile: 'https://bibliaris.com/docs-json',
  apiFile: './src/store/emptyApi.ts',
  apiImport: 'emptySplitApi',
  outputFile: './src/store/api.ts',
  exportName: 'api',
  hooks: true,
};

export default config;
```

### Генерация:

```json
// package.json
{
  "scripts": {
    "codegen": "rtk-query-codegen-openapi openapi-config.ts"
  }
}
```

```bash
yarn codegen
```

### Результат - готовые хуки:

```typescript
// Автоматически сгенерированные хуки
import { useGetBooksQuery, useCreateBookMutation, useGetBookByIdQuery } from './store/api';

// Использование
function BooksList() {
  const { data: books, isLoading } = useGetBooksQuery({ page: 1 });
  const [createBook] = useCreateBookMutation();

  // Полная типизация + кэширование!
}
```

### ⏱️ Время: ~10 минут настройки, потом 1 команда при изменениях

---

## 🎨 Способ 5: Защищенный постоянный доступ (для команды)

### Когда использовать:

- Большая команда фронтенд разработчиков
- Нужен постоянный доступ без SSH
- Хотите защитить паролем

### Настройка Basic Auth в Caddy:

```bash
# 1. SSH на сервер
ssh deploy@bibliaris.com

# 2. Создайте хеш пароля
caddy hash-password
# Введите пароль, скопируйте хеш

# 3. Отредактируйте Caddyfile
sudo nano /etc/caddy/Caddyfile
```

```caddy
# Добавьте в конфиг:
bibliaris.com {
    # Swagger с Basic Auth
    handle /docs* {
        basicauth {
            frontend $2a$14$YOUR_HASH_HERE
        }
        reverse_proxy localhost:5000
    }

    # Остальные маршруты как обычно
    reverse_proxy localhost:5000
}
```

```bash
# 4. Перезагрузите Caddy
sudo systemctl reload caddy

# 5. Включите Swagger постоянно
cd /opt/books/app/src
nano .env.prod
# SWAGGER_ENABLED=1

docker compose --profile prod -f docker-compose.prod.yml restart app
```

### Доступ для команды:

```
URL: https://bibliaris.com/docs
Username: frontend
Password: ваш_пароль
```

### ⏱️ Время: ~5 минут настройки

---

## 📊 Сравнение способов

| Способ                 | Скорость   | Удобство   | Безопасность | Для кого            |
| ---------------------- | ---------- | ---------- | ------------ | ------------------- |
| 1. Временное включение | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     | ⭐⭐⭐⭐     | Разовые задачи      |
| 2. TypeScript типы     | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐   | Постоянная работа   |
| 3. Локальный backend   | ⭐⭐⭐     | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐   | Активная разработка |
| 4. RTK Query CodeGen   | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐   | React + RTK Query   |
| 5. Защищенный доступ   | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐     | Команда             |

---

## 🎯 Рекомендация для вас

### Для быстрого старта прямо сейчас:

```bash
# Вариант A: Посмотреть Swagger сейчас (30 секунд)
ssh deploy@bibliaris.com
cd /opt/books/app/src
./scripts/toggle_swagger.sh enable
# Откройте: https://bibliaris.com/docs
# НЕ ЗАБУДЬТЕ: ./scripts/toggle_swagger.sh disable

# Вариант B: Получить типы (5 секунд)
cd /path/to/books-app-back
yarn openapi:types:prod
# Скопируйте libs/api-client/types.ts в ваш фронтенд проект
```

### Для постоянной работы:

**Рекомендую Способ 2 (TypeScript типы)**:

- Безопасно (не нужно держать Swagger открытым)
- Быстро (одна команда)
- Удобно (типизация в IDE)
- Актуально (обновляете когда нужно)

---

## ❓ FAQ

**Q: Как часто обновлять типы?**
A: После каждого деплоя с изменениями API, или когда видите ошибки типизации

**Q: Можно ли держать Swagger открытым постоянно?**
A: Можно, но лучше с Basic Auth (Способ 5)

**Q: А если нужна GraphQL вместо REST?**
A: У нас REST API, но можно обернуть в GraphQL слой на фронтенде

**Q: Можно ли генерировать не только типы, но и клиент?**
A: Да! См. Способ 4 (RTK Query) или используйте `openapi-generator`

---

## 🔗 Полезные ссылки

- [OpenAPI TypeScript](https://www.npmjs.com/package/openapi-typescript)
- [RTK Query CodeGen](https://redux-toolkit.js.org/rtk-query/usage/code-generation)
- [OpenAPI Generator](https://openapi-generator.tech/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)

---

## 💡 Совет

Начните с **Способа 1** (посмотреть Swagger) + **Способа 2** (сгенерировать типы).

Когда API стабилизируется, перейдите на **Способ 4** (RTK Query CodeGen) для максимального удобства.
