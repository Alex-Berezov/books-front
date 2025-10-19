# Политика кэширования (HTML, статика, медиа)

Цель: единые правила кэша для Next.js, nginx и CDN (R2/Cloudflare).

## HTML/SSR

- Страницы с персонализацией: `Cache-Control: no-store`
- Публичные страницы с ISR: `revalidate` (ISR) + краткоживущие клиентские заголовки (если нужно)

## Статические ассеты

- `/_next/static/*`: immutable, 1 год (`public, immutable, max-age=31536000`)
- Шрифты/иконки/CSS: 30 дней — 1 год (с версионированием)

## Медиа (CDN)

- Ключи версионировать (включать хэш)
- CDN: длинные TTL, revalidate по замене ключа
- Next Image: использовать `images.remotePatterns/domains`

## API

- Публичные кэшируемые ответы: `Cache-Control: public, max-age=60` (пример)
- Важно: для мутабельных данных — `no-store`/Etag

## Инфраструктурные фрагменты

- next.config.js → headers()
- nginx location для `_next/static` и медиа
- Cloudflare Cache Rules/Edge TTL — по домену медиа
