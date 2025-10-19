# Переменные окружения (env) — матрица

Назначение: единое место, где перечислены переменные и их значения по средам. Секреты не храним в репозитории — только в секрет-хранилищах (GitHub Environments/Secrets, переменные на VPS).

Базовые правила:

- Клиентские переменные только с префиксом `NEXT_PUBLIC_` (не содержат секретов).
- Серверные/секретные переменные без префикса — только в секрет-хранилищах или локально вне гита.
- Пакетный менеджер: Yarn (Corepack). Устанавливаем: `yarn install --frozen-lockfile`.

## Перечень переменных

Обязательные:

- `NEXT_PUBLIC_SITE_URL` — публичный URL сайта (https://example.com, для dev — http://localhost:3000).
- `NEXT_PUBLIC_DEFAULT_LANG` — язык по умолчанию (например, `en`).
- `NEXT_PUBLIC_LANGS` — список языков через запятую (`en,es,fr,pt`).
- `NEXT_PUBLIC_UPLOADS_BASE_URL` — публичная база для медиа/CDN (например, `https://media.example.com` или публичный R2 endpoint).
- `API_BASE_URL` — базовый URL бэкенда (серверный, для SSR/роутов).

Если используется Auth.js:

- `NEXTAUTH_URL` — базовый URL приложения для колбэков (на проде — HTTPS домен).
- `NEXTAUTH_SECRET` — секрет подписи JWT/куков.

Наблюдаемость (опционально):

- `SENTRY_DSN`, `SENTRY_ENVIRONMENT` — интеграция Sentry.

Cloudflare R2 / CDN (пример, только если требуется):

- `CF_R2_PUBLIC_DOMAIN` — публичный домен/endpoint для раздачи медиа (без секрета).
- (Секретные ключи доступа R2 — только на бэкенде/воркерах, не во фронте!)

## Профили сред

Dev (`.env.local`, локально):

- Укажите локальные значения. Секреты допустимы локально, но файл не коммитим.

Stage/Prod (на серверах/CI):

- Значения задаются в Secrets/Environments (GitHub Actions) и/или в `/etc/<project>/*.env` на VPS.

## Next Image и CDN

- Добавьте домены CDN/медиа в `next.config.js` → `images.domains` или `images.remotePatterns`.
- Для immutable ресурсов используйте версионирование ключей и длинные `Cache-Control`.

## Пример

Смотрите `.env.example` в корне репозитория.
