# M10 — CI/CD и деплой — подробное ТЗ

Цель: построить надёжный и воспроизводимый процесс доставки фронтенда (Next.js) в прод/стейдж, с безопасной работой переменных окружения, откатами, наблюдаемостью и пост‑деплой проверками.

Базовый вариант: контейнеризация (Docker) + реестр образов (GHCR) + деплой на VM через docker-compose и реверс‑прокси nginx. Альтернативы: Vercel (PaaS) или Kubernetes — описаны как опции.

Зависимости: M0–M9.

---

## Результат этапа

- Собирается production‑образ, опубликован в реестре.
- Один клик/команда деплой на stage/prod, с health‑чеками и быстрым откатом.
- Переменные окружения разделены по средам; секреты — только через секрет‑хранилища.
- Пост‑деплойные smoke‑тесты проходят; базовый мониторинг/логирование подключены.

---

## Задачи и ТЗ

### 1) Окружения и переменные

ТЗ:

- Завести матрицу переменных: `.env.local` (dev), `.env.stage`, `.env.prod` (только для справки — без секретов в гите). Клиентские — только с префиксом `NEXT_PUBLIC_`.
- Критичные переменные:
  - `NEXT_PUBLIC_SITE_URL` — публичный URL сайта.
  - `NEXT_PUBLIC_DEFAULT_LANG`, `NEXT_PUBLIC_LANGS` — языки.
  - `API_BASE_URL` — серверный base URL БЭКа (используется на сервере SSR/route handlers).
  - `NEXTAUTH_URL`, `NEXTAUTH_SECRET` — при использовании NextAuth.
  - `SENTRY_DSN`, `SENTRY_ENVIRONMENT` — если включаем Sentry.
  - `NEXT_PUBLIC_UPLOADS_BASE_URL` — публичная база для медиа (например, R2/Cloudflare).
  - `CF_R2_PUBLIC_BUCKET`/`CF_R2_PUBLIC_DOMAIN` — если нужен прямой доступ к бакету (серверные/секретные, без NEXT_PUBLIC).
- Хранение секретов: GitHub Actions Secrets/Environments, переменные VM через `.env` вне репо.
  Критерии приёмки:
- Чёткий список переменных по средам; клиентские не содержат секретов.
  Артефакты:
- `docs/deploy/env.md` (описание), шаблон `.env.example`.

### 2) Production сборка и оптимизации Next.js

ТЗ:

- Проверить `next.config.js`:
  - включить `reactStrictMode: true`, `swcMinify: true`;
  - `images` (домен(ы) CDN/бекенда, в т.ч. R2/Cloudflare), `headers()` — security headers; `compress: true`.
- Настроить ISR/ревайд: глобальный `revalidate` (по страницам), он‑деманд ревалидейшн endpoint для контента, который обновляется из админки.
  Критерии приёмки:
- Prod‑build (`next build`) успешен; страницы с ISR обновляются по сигналу.
  Артефакты:
- Обновлённый `next.config.js`, docs по ревайд.

### 2.1) CDN/Uploads (Cloudflare R2)

ТЗ:

- Медиа (обложки, картинки страниц/книг) раздаются из CDN‑домена (например, `https://media.example.com` на базе R2 + Cloudflare CDN).
- FE использует абсолютные URL из `NEXT_PUBLIC_UPLOADS_BASE_URL` + относительный ключ.
- Next Image: добавить CDN‑домен(ы) в `images.remotePatterns` или `images.domains`.
- Кэш‑заголовки: длинные `Cache-Control` для immutable ресурсов (версированные ключи), более короткие для динамических.
- В админке загрузка — на бэкенд, который пишет в R2 и возвращает публичный URL/ключ (FE не держит секреты R2!).
  Критерии приёмки:
- Изображения корректно отображаются из CDN; Next Image оптимизирует и не ругается на домен.
  Артефакты:
- Раздел в `docs/deploy/env.md` про медиадомены; фрагмент `next.config.js` (images).

### 3) Docker-образ (multi-stage)

ТЗ:

- Multi‑stage Dockerfile (Node 20‑alpine): stage `builder` (install, build) и `runner` (`next start`).
- Проброс билд‑аргов для клиентских переменных (`NEXT_PUBLIC_*`), серверные — как env на рантайме.
- UID/GID невиртуального пользователя, `NODE_ENV=production`, `PORT=3000`.
- `.dockerignore` для уменьшения контекста.
  Критерии приёмки:
- Локальная сборка и запуск образа работают; размер образа разумный (< 300MB, ориентир).
  Артефакты:
- `Dockerfile`, `.dockerignore` (каркасы ниже).

### 4) docker-compose для stage/prod

ТЗ:

- `docker-compose.prod.yml`: сервис `web`, сеть `webnet`, монтирование только для логов (опц.), `restart: always`.
- Переменные окружения из внешнего `.env` файла на сервере.
- Healthcheck (curl `http://localhost:3000/healthz`).
  Критерии приёмки:
- `docker compose -f docker-compose.prod.yml up -d` поднимает сервис; health — OK.
  Артефакты:
- `docker-compose.prod.yml` (каркас ниже).

### 5) Реверс‑прокси nginx

ТЗ:

- Конфиг для HTTPS (сертификат через certbot/lego/traefik, вне задачи), проксирование на `web:3000`.
- Агрессивное кэширование `_next/static` и изображений; gzip/brotli.
- Заголовки безопасности (CSP/HSTS/X-Frame-Options и др.).
  Критерии приёмки:
- Статика отдаётся с кэшем; безопасные заголовки видны; HTTP→HTTPS редирект.
  Артефакты:
- `deploy/nginx/conf.d/site.conf` (каркас ниже).

### 6) CD: публикация образа и деплой на VM

ТЗ:

- GitHub Actions workflow `cd.yml`:
  - Триггер по `release` или `workflow_dispatch` с выбором среды.
  - Сборка Docker‑образа, тегирование (`ghcr.io/<owner>/<repo>:<git-sha|semver|env>`), push в GHCR.
  - SSH на VM: pull образа, `docker compose up -d` с новым тегом.
  - Post‑deploy smoke (curl healthz, опц. Playwright subset).
- Secrets: `GHCR_TOKEN` (или GITHUB_TOKEN с правами), `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `ENV`.
  Критерии приёмки:
- Вручную запущенный деплой обновляет версию без даунтайма (graceful reload через nginx).
  Артефакты:
- `.github/workflows/cd.yml` (каркас ниже), `deploy/README.md`.

### 7) Post‑deploy smoke‑тесты

ТЗ:

- Минимальный набор e2e против целевого URL: главная /:lang, одна публичная страница, редирект на логин при /admin/:lang, healthz.
- В CD — отдельный шаг, не блокирующий откат.
  Критерии приёмки:
- Smoke проходит на stage/prod; фейл триггерит уведомление и предложение отката.
  Артефакты:
- `e2e/smoke/*.spec.ts` (ссылка на M9), шаг в `cd.yml`.

### 8) Откаты

ТЗ:

- Хранить N последних тегов (например, 5). В CD — input «rollback_to» для деплоя конкретного тега.
- Документация по ручному откату через compose и переключение тега.
  Критерии приёмки:
- Откат до предыдущего релиза за < 5 минут.
  Артефакты:
- Раздел в `deploy/README.md` + job в `cd.yml`.

### 9) Наблюдаемость и логи

ТЗ:

- Логи приложения — в stdout (JSON/структурированные), сбор docker‑логов через journald/Vector/Fluent Bit (вне зоны — описать варианты).
- Web Vitals — репортинг на собственный endpoint `/api/vitals` (или внешнюю аналитику), Sentry (если включён).
- Alerting: базовый — по фейлу CD/Smoke в GitHub Notifications.
  Критерии приёмки:
- Логи доступны на VM; vitals видны/отправляются; Sentry получает события.
  Артефакты:
- `docs/deploy/observability.md`, каркас `app/api/vitals/route.ts` (опц.).

### 10) Security hardening

ТЗ:

- Заголовки: CSP (default-src 'self'; img/media/font домены), HSTS, X‑Content‑Type‑Options, Referrer‑Policy, Permissions‑Policy.
- Ограничить экспонирование заголовков сервера; включить gzip/brotli; ограничить upload/max body (если есть загрузки).
- Проверка через `securityheaders.com` (ручная).
  Критерии приёмки:
- Оценка A/A+ на securityheaders (реалистично — A).
  Артефакты:
- `next.config.js` headers и `nginx` конфиг.

### 11) Вариант: деплой на Vercel (опция)

ТЗ:

- `vercel.json` (region, headers/redirects), подключение проекта к репо, переменные окружения для Prod/Preview/Dev.
- ISR/On‑Demand и Edge‑функции — по необходимости.
  Критерии приёмки:
- Автодеплой по PR (Preview) и main (Prod); переменные корректны.
  Артефакты:
- `vercel.json`, `docs/deploy/vercel.md`.

### 12) Вариант: Kubernetes (опция)

ТЗ:

- Манифесты: Deployment, Service, Ingress (ингресс‑контроллер с TLS), HPA (по CPU/RAM).
- Секреты как `Secret`, переменные как `ConfigMap`.
  Критерии приёмки:
- Поднимается на cluster; readiness/liveness probes зелёные.
  Артефакты:
- `deploy/k8s/*` (каркасы, опц.).

### 13) Документация и runbook

ТЗ:

- `docs/deploy/README.md`:
  - среды, переменные, как собрать локально prod‑образ, как деплоить/откатывать;
  - типичные проблемы и решения; чек‑лист релиза.
    Критерии приёмки:
- Любой разработчик может воспроизвести деплой.
  Артефакты:
- `docs/deploy/README.md`.

---

## Схема директорий (релевантное для M10)

```
.deploy/
  nginx/conf.d/site.conf
  k8s/ (опц.)
.github/workflows/
  cd.yml
Dockerfile
.dockerignore
docker-compose.prod.yml
vercel.json (опц.)
docs/deploy/
  README.md
  env.md
  observability.md
```

---

## Каркасы (скелеты)

### Dockerfile (Next.js)

```dockerfile
# --- builder ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
# Проброс клиентских переменных на билд (если нужно)
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN yarn build

# --- runner ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Невиртуальный пользователь для безопасности
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
USER nextjs
EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
```

Примечание: для `standalone` добавьте в `next.config.js` `output: 'standalone'` и скопируйте необходимые файлы. Иначе используйте `next start`:

```dockerfile
CMD ["yarn", "start"]
```

### .dockerignore

```
.next/cache
node_modules
.git
.gitignore
Dockerfile
.dockerignore
coverage
**/*.log
.vscode
```

### docker-compose.prod.yml

```yaml
services:
  web:
    image: ghcr.io/OWNER/REPO:latest
    env_file:
      - /etc/books-app-front/prod.env
    ports:
      - '127.0.0.1:3000:3000'
    restart: always
    healthcheck:
      test: ['CMD', 'wget', '-qO-', 'http://localhost:3000/healthz']
      interval: 30s
      timeout: 5s
      retries: 3
    networks: [webnet]
networks:
  webnet:
    external: true
```

### nginx конфиг (фрагмент)

```nginx
server {
  listen 80;
  server_name example.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name example.com;

  # ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
  # ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

  gzip on; gzip_types text/plain text/css application/json application/javascript image/svg+xml;
  brotli on; brotli_types text/plain text/css application/json application/javascript image/svg+xml;

  location / {
    proxy_pass http://web:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location ~* ^/_next/static/ { expires 1y; add_header Cache-Control "public, immutable"; }
  location ~* \.(png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?)$ { expires 30d; add_header Cache-Control "public"; }

  add_header X-Frame-Options DENY;
  add_header X-Content-Type-Options nosniff;
  add_header Referrer-Policy strict-origin-when-cross-origin;
  add_header Permissions-Policy "geolocation=(), microphone=(), camera=()";
}
```

### GitHub Actions CD (`.github/workflows/cd.yml`)

```yaml
name: CD
on:
  workflow_dispatch:
    inputs:
      env:
        description: "Environment (stage|prod)"
        required: true
        default: "stage"
      tag:
        description: "Image tag (default: commit sha)"
        required: false
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: echo "IMAGE=ghcr.io/${{ github.repository }}:${{ inputs.tag || github.sha }}" >> $GITHUB_ENV
      - run: echo $CR_PAT | docker login ghcr.io -u $GITHUB_ACTOR --password-stdin
        env:
          CR_PAT: ${{ secrets.GHCR_TOKEN || secrets.GITHUB_TOKEN }}
      - run: docker build -t $IMAGE --build-arg NEXT_PUBLIC_SITE_URL=${{ vars.SITE_URL }} .
  - run: echo "Using uploads CDN: ${{ vars.UPLOADS_BASE_URL }}"
      - run: docker push $IMAGE
      - name: Deploy over SSH
        uses: easingthemes/ssh-deploy@v5
        with:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_KEY }}
          REMOTE_HOST: ${{ secrets.SSH_HOST }}
          REMOTE_USER: ${{ secrets.SSH_USER }}
          SCRIPT_AFTER: |
            export IMAGE=${IMAGE}
            cd /opt/books-app-front
            sed -i "s|image: .*|image: ${IMAGE}|" docker-compose.prod.yml
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d
      - name: Smoke
        run: |
          curl -fsSL ${{ vars.SITE_URL }}/healthz
```

### Healthcheck endpoint (каркас)

```ts
// app/healthz/route.ts
import { NextResponse } from 'next/server'
export function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() })
}
```

### Headers в next.config.js (фрагмент)

```ts
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, immutable, max-age=31536000',
          },
        ],
      },
    ]
  },
}
```

### vercel.json (опция)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

---

## Риски и примечания

- Клиентские переменные immutable на момент билда: для динамики — только серверные варианты или отдельный runtime‑endpoint.
- ISR требует системного триггера из админки: нужен защищённый endpoint (подпись/секрет).
- Nginx/SSL/сертификаты — операционная часть (можно автоматизировать через Caddy/Traefik).
- Права на GHCR и SSH окружение — должны быть настроены в органиазации.
- Для R2/CDN: секреты доступа остаются на бэкенде/воркерах; фронт работает только с публичными URL.

## Примечание: staging без домена

- Можно поднимать временный стенд на VPS по IP или техдомену провайдера; CDN для медиа можно настроить позже, используя прямой R2 публичный endpoint.

## Чек‑лист готовности M10

- [ ] Матрица переменных и .env.example
- [ ] Production сборка Next и ISR/ревайд
- [ ] Dockerfile + .dockerignore
- [ ] docker-compose.prod.yml
- [ ] nginx конфиг и TLS (или альтернатива)
- [ ] GitHub Actions CD и публикация образа
- [ ] Post‑deploy smoke‑тесты
- [ ] Документация и откаты
