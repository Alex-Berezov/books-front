# Быстрый старт разработки

> Краткая шпаргалка для начала работы

---

## 🎯 Цель проекта

Мультиязычная платформа для чтения и прослушивания аудиокниг (Bibliaris).

---

## 📋 Что уже готово

✅ **Backend API:** https://api.bibliaris.com/api  
✅ **Документация бэкенда:** `docs/frontend-agents/`  
✅ **План разработки:** `docs/plan/DEVELOPMENT-PLAN.md`  
✅ **Детальные ТЗ:** `docs/milestones/M0-M10.md`

---

## 🚀 Старт работы (5 шагов)

### 1. Изучить ключевую документацию (30 мин)

```bash
# Обязательно прочитать:
cat docs/frontend-agents/backend-api-reference.md  # API контракты
cat docs/frontend-agents/quickstart.md             # Быстрый старт
cat docs/milestones/M0-bootstrap.md                # Первый этап
```

**Ключевые моменты:**

- API URL: `https://api.bibliaris.com/api`
- Языки: `en`, `es`, `fr`, `pt`
- Роутинг: `/:lang/...` для публичной части
- Токены: Access (12h) + Refresh (7d)

---

### 2. Инициализировать проект (10 мин)

```bash
# Создать Next.js проект
npx create-next-app@latest . --typescript --app --eslint --tailwind=false --src-dir=false

# Или если папка уже существует:
npx create-next-app@latest books-app-front --typescript --app --eslint

# Установить основные зависимости
yarn add antd @ant-design/icons
yarn add @tanstack/react-query @tanstack/react-query-devtools
yarn add next-auth
yarn add -D prettier eslint-config-prettier
```

---

### 3. Настроить окружение (5 мин)

```bash
# Создать .env.local
cat > .env.local << 'EOF'
# API Backend
NEXT_PUBLIC_API_BASE_URL=https://api.bibliaris.com/api

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-change-this-in-production

# Development (optional)
# NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
EOF
```

---

### 4. Создать базовую структуру (15 мин)

```bash
# Создать структуру каталогов
mkdir -p app/\[lang\]
mkdir -p app/admin/\[lang\]
mkdir -p app/\(neutral\)
mkdir -p src/{components,lib,api,types,utils}
mkdir -p src/components/{admin,public}

# Создать основные файлы
touch app/[lang]/layout.tsx
touch app/[lang]/page.tsx
touch app/admin/[lang]/layout.tsx
touch app/admin/[lang]/page.tsx
touch src/lib/http.ts
touch src/types/next-auth.d.ts
```

**Структура должна быть:**

```
app/
├── [lang]/              # Публичный сайт (/:lang)
│   ├── layout.tsx
│   ├── page.tsx
│   ├── books/
│   ├── pages/
│   └── auth/
├── admin/[lang]/        # Админка (/admin/:lang)
│   ├── layout.tsx
│   └── page.tsx
└── (neutral)/           # Без языка (/versions/:id)
    └── versions/
src/
├── components/
│   ├── admin/
│   └── public/
├── lib/
├── api/
├── types/
└── utils/
```

---

### 5. Запустить dev-сервер (1 мин)

```bash
yarn dev

# Открыть http://localhost:3000
```

---

## 📚 Дальнейшие шаги

После базовой настройки:

### Этап M0 (Фундамент) — детальные задачи:

1. **Настроить Ant Design**

   - Создать `src/providers/AppProviders.tsx`
   - Подключить ConfigProvider с темой
   - Настроить глобальные стили

2. **Реализовать i18n-роутинг**

   - `app/[lang]/layout.tsx` — проверка языка (en|es|fr|pt)
   - Переключатель языка в шапке
   - Утилиты `src/utils/i18n.ts`

3. **Базовые компоненты**

   - Header/Footer
   - LanguageSwitcher
   - ErrorBoundary
   - NotFound страница

4. **React Query**

   - `src/lib/queryClient.ts`
   - Провайдер в AppProviders
   - Базовые настройки кэша

5. **NextAuth заготовка**
   - `app/api/auth/[...nextauth]/route.ts`
   - Типы `src/types/next-auth.d.ts`
   - Placeholder для Credentials provider

**Критерий готовности M0:**

- ✅ Проект собирается без ошибок
- ✅ Работают маршруты `/:lang` и `/admin/:lang`
- ✅ Переключатель языка меняет URL
- ✅ Базовый layout с шапкой/футером

---

## 🔍 Полезные команды

```bash
# Разработка
yarn dev                 # Запуск dev-сервера
yarn build              # Production сборка
yarn start              # Запуск production сборки
yarn lint               # Проверка линтером
yarn type-check         # Проверка типов TypeScript

# Генерация типов из API (позже в M2)
curl https://api.bibliaris.com/api/docs-json -o api-schema.json
npx openapi-typescript api-schema.json -o src/types/api-schema.ts
```

---

## 📖 Документация по этапам

| Этап | Документ                               | Статус           |
| ---- | -------------------------------------- | ---------------- |
| M0   | `docs/milestones/M0-bootstrap.md`      | 👉 **Следующий** |
| M1   | `docs/milestones/M1-auth-and-roles.md` | Ожидание         |
| M2   | `docs/milestones/M2-data-and-types.md` | Ожидание         |
| M3   | `docs/milestones/M3-admin-mvp.md`      | Ожидание         |
| ...  | ...                                    | ...              |

---

## 🆘 Частые вопросы

### Q: Где взять актуальные типы API?

**A:**

```bash
# Скачать OpenAPI схему
curl https://api.bibliaris.com/api/docs-json -o api-schema.json

# Или временно использовать Swagger UI
# (нужно временно включить на сервере через SSH)
```

### Q: Как тестировать API локально?

**A:** Используй production API (`https://api.bibliaris.com/api`). Он готов и стабилен.

### Q: Какой package manager использовать?

**A:** **Только Yarn** (через Corepack). Не используй npm или pnpm.

### Q: Как обрабатывать ошибки API?

**A:** Детально описано в `docs/frontend-agents/error-handling.md` и будет реализовано в M2.

### Q: Нужна ли мне база данных на фронте?

**A:** Нет. Фронт — только UI. Все данные через Backend API.

---

## ✅ Чеклист перед началом разработки

- [ ] Изучил `docs/frontend-agents/backend-api-reference.md`
- [ ] Изучил `docs/milestones/M0-bootstrap.md`
- [ ] Next.js проект инициализирован
- [ ] `.env.local` настроен
- [ ] Базовая структура каталогов создана
- [ ] `yarn dev` работает
- [ ] Понял архитектуру и роутинг (`:lang` префиксы)

---

## 🎯 Следующий шаг

**Начать реализацию M0 (Фундамент проекта)**

📖 Открыть детальное ТЗ: `docs/milestones/M0-bootstrap.md`  
📋 Разбить на задачи и приступить к разработке

---

**Удачи в разработке! 🚀**
