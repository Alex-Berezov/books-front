# M9 — Тесты и качество — подробное ТЗ

Цель: внедрить контур качества: unit и компонентные тесты, e2e сценарии, статический анализ (ESLint/TS), форматирование, pre-commit hooks и CI. Обеспечить стабильную сборку, измеримую надёжность и контроль регрессий.

Зависимости: M0–M8 (основной функционал реализован).

## Результат этапа

- Настроены и работают: Unit/Component (Vitest + Testing Library) и E2E (Playwright).
- ESLint/Prettier/Typecheck подключены к pre-commit и CI; пороги покрытия заданы и выполняются.
- CI (GitHub Actions или иной) прогоняет линтеры, типизацию, unit/компонентные тесты; e2e — отдельно/по метке.

---

## Общие принципы

- Пирамида тестирования: максимум unit/компонентных; e2e — только критические пути.
- Предпочитать role‑based селекторы (@testing-library) вместо data-testid; но для сложных кейсов вводим data-testid.
- Моки API через MSW для unit/компонентных; для e2e — реальный бэкенд или зафиксированный мок‑сервер.
- Детерминизм: фиксация времени/рандома в тестах; таймауты и ретраи для e2e.

---

## Задачи и ТЗ

### 1) Инструменты и скрипты

ТЗ:

- Принять стек: Vitest + @testing-library/react + @testing-library/jest-dom; Playwright для e2e.
- Добавить npm‑скрипты:
  - `test` (vitest), `test:watch`, `test:coverage`.
  - `e2e` (playwright test), `e2e:headed`.
  - `lint`, `format`, `typecheck`.
- Пороги покрытия: global ≥ 80% lines/branches; критические модули (http/seo/i18n) — ≥ 90% (можно поэтапно).
  Критерии приёмки:
- Команды выполняются локально; покрытие собирается.
  Артефакты:
- `package.json` scripts, `vitest.config.ts`, `playwright.config.ts`, `setupTests.ts`.

### 2) Конфигурация Vitest и RTL

ТЗ:

- Создать `vitest.config.ts` с `environment: 'jsdom'`, алиасами `@/src/*`, coverage (lcov + text), exclude: `.next`, `e2e`, `node_modules`.
- Создать `setupTests.ts` и подключить `@testing-library/jest-dom`.
- Добавить пример unit и компонентного теста.
  Критерии приёмки:
- Vitest запускается; basic тесты проходят.
  Артефакты:
- `vitest.config.ts`, `setupTests.ts`, `__tests__/*`.

### 3) Playwright E2E

ТЗ:

- `playwright.config.ts`: проекты для Chromium/WebKit/Firefox (или только Chromium в CI), retries: 2, timeout: 30s, baseURL из env.
- Базовые сценарии:
  - Публичка: открытие `/:lang/pages/[slug]`, `/:lang/books/[slug]/overview`, таксономии; переключение языка.
  - Ридер: `/versions/:id` (текст/аудио) — навигация, прогресс (минимальная проверка).
  - Auth/admin: редирект на логин при входе в `/admin/:lang`; успешный логин и доступ.
- Снятие скриншотов/видео при фейлах (опц. в CI).
  Критерии приёмки:
- Локально e2e проходят на базе доступных данных; CI‑тесты помечены как optional/по метке.
  Артефакты:
- `playwright.config.ts`, `e2e/*.spec.ts`.

### 4) MSW для мока API (unit/компонентные)

ТЗ:

- Подключить MSW: `src/tests/msw/server.ts` (server), `handlers.ts` для ключевых эндпоинтов (`/auth/login`, `/users/me`, публичные страницы, seo/resolve).
- В `setupTests.ts` — поднять/остановить сервер перед/после тестов.
- Предусмотреть переключение на реальный бэкенд (env) без MSW.
  Критерии приёмки:
- Компонентные тесты не зависят от сети; моки легко расширяются.
  Артефакты:
- `src/tests/msw/*`.

### 5) Тесты ключевых модулей

ТЗ:

- Unit:
  - `src/lib/http.ts` — заголовки, ошибки, JSON parse, 401 retry‑политика (минимально, без next‑auth интеграции).
  - `src/lib/errors.ts` — маппинг статусов.
  - `src/lib/seo.ts` — canonical/hreflang/utm‑фильтрация.
  - `src/utils/public-i18n.ts`/`admin-i18n.ts` — резолв путей/языков.
  - `src/utils/reader-links.ts` — сбор deeplink.
- Component:
  - `LanguageSwitcher`, `AdminLanguageSwitcher` (смена языка, сохранение query).
  - `SeoPreview` (отображение title/description/ограничений по длине).
  - Reader: `AudioPlayer` базовые управления (play/pause/next callbacks); `BookshelfToggle` оптимистичность.
    Критерии приёмки:
- Набор тестов покрывает основные ветки и edge‑кейс.
  Артефакты:
- `__tests__/lib/*.test.ts`, `__tests__/components/*.test.tsx`.

### 6) ESLint/Prettier/Typecheck и pre-commit

ТЗ:

- Обновить ESLint правила (React/TS/Next best practices), включить плагины import/order, unused‑imports (или TS).
- Настроить Prettier и .editorconfig; добавить `lint-staged` + Husky pre-commit (lint + format + unit быстрые).
- `typecheck`: `tsc --noEmit` (или `next type-check` при наличии).
  Критерии приёмки:
- Коммит без форматирования/линта не проходит; `yarn typecheck` зелёный.
  Артефакты:
- `.eslintrc*`, `.prettierrc*`, `.editorconfig`, `.husky/*`, `lint-staged` config.

### 7) CI/CD — пайплайн качества

ТЗ:

- GitHub Actions workflow `ci.yml`:
  - Триггеры: PR на main, push в feature/\* (опц.).
  - Job: setup Node, cache yarn, `yarn install --frozen-lockfile`, `yarn lint`, `yarn typecheck`, `yarn test:coverage`.
  - Отчёты: загрузить coverage (lcov) как артефакт; (опц.) комментарий в PR.
  - E2E: отдельный job по метке `e2e` или по расписанию; установка браузеров `npx playwright install --with-deps`.
    Критерии приёмки:
- PR показывает статус CI; покрытие/линуты видны; e2e можно включать/отключать.
  Артефакты:
- `.github/workflows/ci.yml`.

### 8) Пороговые проверки и отчётность

ТЗ:

- В Vitest задать `coverage.thresholds`: lines/branches 80% global; исключения — в комментариях к коду.
- Генерировать `coverage/lcov.info` и (опц.) `junit` для CI.
- Обновлять `docs/quality/coverage.md` краткими сводками (опц.).
  Критерии приёмки:
- Пороги соблюдены; отчёты доступны в CI.
  Артефакты:
- `vitest.config.ts` (thresholds), `docs/quality/coverage.md` (опц.).

### 9) Борьба с флейками (e2e)

ТЗ:

- Включить `retries: 2` и разумные `expect` timeouts; дождаться селекторов по ролям.
- Стабилизировать сетевые ожидания (ждать окончания загрузок, а не `sleep`).
- При фейлах — писать видео/трейсы.
  Критерии приёмки:
- Повторный прогон уменьшает случайные падения; отчёты помогают отладке.
  Артефакты:
- Настройки в `playwright.config.ts`.

### 10) Фикстуры и сиды для тестов

ТЗ:

- Завести фабрики данных (plain builders) для книг/версий/страниц; общие фикстуры для e2e (если без реального бэка).
- Изолировать тестовые данные (уникальные slug/ID), чистка после.
  Критерии приёмки:
- Тесты не конфликтуют между собой; повторно воспроизводимы.
  Артефакты:
- `src/tests/factories/*`, `e2e/fixtures/*`.

### 11) Документация

ТЗ:

- Написать `docs/tests/README.md`: как запускать тесты локально/в CI, как писать тесты, гайд по селекторам, политика data-testid.
  Критерии приёмки:
- Любой разработчик может запустить и добавить тест без боли.
  Артефакты:
- `docs/tests/README.md`.

---

## Схема директорий (релевантное для M9)

```
__tests__/
  lib/*.test.ts
  components/*.test.tsx

e2e/
  *.spec.ts
  fixtures/*

src/tests/
  msw/server.ts
  msw/handlers.ts
  factories/*

vitest.config.ts
setupTests.ts
playwright.config.ts
.github/workflows/ci.yml
```

## Каркасы (скелеты)

### `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./setupTests.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 0.8,
        branches: 0.8,
        functions: 0.8,
        statements: 0.8,
      },
    },
  },
  resolve: {
    alias: { '@/src': path.resolve(__dirname, 'src') },
  },
})
```

### `setupTests.ts`

```ts
import '@testing-library/jest-dom'
```

### `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  timeout: 30_000,
  retries: 2,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
```

### Пример unit‑теста (`__tests__/lib/http.test.ts`)

```ts
import { describe, it, expect } from 'vitest'
import { isApiError } from '@/src/lib/http'

describe('http', () => {
  it('should identify ApiError', () => {
    expect(isApiError({ status: 404, message: 'Not found' })).toBe(true)
  })
})
```

### Пример компонентного теста (`__tests__/components/LanguageSwitcher.test.tsx`)

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LanguageSwitcher } from '@/src/components/LanguageSwitcher'

test('switches language', async () => {
  render(<LanguageSwitcher currentLang='en' currentPath='/en/pages/home' />)
  await userEvent.click(screen.getByRole('button', { name: /en/i }))
  // ...дальше проверить вызов навигации/формирование href
})
```

### GitHub Actions CI (`.github/workflows/ci.yml`)

```yml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'yarn'
      - run: yarn install --frozen-lockfile
      - run: yarn lint
      - run: yarn typecheck
      - run: yarn test:coverage
      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage
```

---

## Риски и примечания

- E2E может зависеть от доступности бэка и данных: предусмотреть мок‑режим или nightly прогоны.
- Покрытие — инструмент, а не цель: не повышать ради «зелёных цифр», а фокус на критических ветках.
- Следить за длительностью CI; разделять быстрые и медленные проверки.

## Чек‑лист готовности M9

- [ ] Скрипты test/lint/typecheck настроены
- [ ] Vitest + RTL работают, есть базовые тесты
- [ ] Playwright настроен, базовые сценарии работают
- [ ] MSW подключён для unit/компонентных
- [ ] Пороги покрытия заданы и выполняются
- [ ] Husky + lint-staged блокируют «грязные» коммиты
- [ ] CI прогоняет линтер/типизацию/тесты и публикует артефакты
