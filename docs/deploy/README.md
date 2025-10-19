# Deploy / Staging гайд

Цель: быстро поднять стенд (staging) и затем прод с минимальными сюрпризами.

## Staging без домена (по IP или техдомену)

1. VPS c Docker + docker compose
2. Создать `/opt/books-app-front` и положить `docker-compose.prod.yml` и env
3. Заполнить `/etc/books-app-front/prod.env` по `docs/deploy/env.md`
4. Запустить: `docker compose -f docker-compose.prod.yml up -d`
5. Открыть по IP:3000 (или повесить временный nginx)

## Домен и TLS

- Подключить nginx (пример конфига в M10) и Let’s Encrypt
- Переключить `NEXTAUTH_URL` и `NEXT_PUBLIC_SITE_URL` на HTTPS домен

## CDN/Uploads (R2)

- Настроить публичный endpoint/домен для медиа
- Указать `NEXT_PUBLIC_UPLOADS_BASE_URL`
- Добавить домен в `next.config.js → images` (см. M10)

## Ссылки

- M10 — CI/CD, Docker, nginx, CD workflow
- `docs/deploy/env.md` — переменные окружения
- `docs/deploy/cache-policy.md` — кэш
- `docs/ops/uptime-monitoring.md` — аптайм
