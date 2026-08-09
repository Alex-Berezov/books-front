#!/usr/bin/env bash
#
# Выкат фронта без окна недоступности.
#
# Раньше выкат был `docker compose up -d` на единственном контейнере: Compose
# останавливал старый и поднимал новый, и между этими моментами запросы не
# обслуживал никто. Аудит намерил 13–37 % запросов без чистого ответа в прогонах
# после деплоя против 0 из 206 в тихий час — разница и есть размер окна
# (`books-app-docs/tasks/zero-downtime-deploy/TASK.md`).
#
# Здесь новая версия поднимается **рядом** со старой на свободном порту, и трафик
# переводится на неё только после того, как она сама ответила. Старая гасится
# после паузы на дослуживание.
#
# 🔴 Второе, что это меняет, важнее окна: раньше сломанный образ ронял сайт —
# старый контейнер уже остановлен, новый не встаёт. Теперь непрошедшая проверка
# готовности означает неудачный выкат при живом сайте: переключения просто не
# происходит, и наверху остаётся прошлая версия.
#
# Запускается на VPS деплой-воркфлоу. Требует sudo для перезагрузки Caddy.

set -euo pipefail

COMPOSE_DIR=/opt/bibliaris-frontend/app/src
COMPOSE_FILE=docker-compose.prod.yml
UPSTREAM_FILE=/etc/caddy/frontend-upstream.caddy

# Сколько ждать, пока новая версия начнёт отвечать. Next.js со standalone-сборкой
# поднимается за секунды, но холодный старт после `pull` бывает дольше.
READY_ATTEMPTS=60
READY_INTERVAL=2

# Пауза перед остановкой старой версии. Она не косметическая: отданный ранее HTML
# ссылается на ассеты со своим buildId (`/_next/static/<buildId>/…`), и они лежат
# только в том контейнере, который его отдал. Гасить его сразу — значит ловить
# 404 на чанках у тех, кто получил страницу за миг до переключения.
DRAIN_SECONDS=45

cd "$COMPOSE_DIR"

# Единственный источник правды о том, кто сейчас наверху, — сам конфиг Caddy.
# Отдельный файл состояния рассинхронизировался бы с ним при первой же ручной
# правке, и выкат начал бы гасить работающий контейнер.
current_port="$(grep -oE '300[12]' "$UPSTREAM_FILE" 2>/dev/null | head -1 || true)"

if [ "$current_port" = "3001" ]; then
  CURRENT=blue
  TARGET=green
  TARGET_PORT=3002
else
  # Сюда же попадает первый запуск, когда файла ещё нет: поднимаем синий.
  CURRENT=green
  TARGET=blue
  TARGET_PORT=3001
fi

echo "[deploy] active=$CURRENT -> target=$TARGET (port $TARGET_PORT)"

docker compose -f "$COMPOSE_FILE" pull "frontend-$TARGET"
docker compose -f "$COMPOSE_FILE" up -d --force-recreate "frontend-$TARGET"

echo "[deploy] waiting for frontend-$TARGET to answer on $TARGET_PORT"
ready=0
for i in $(seq 1 "$READY_ATTEMPTS"); do
  # `/en` — настоящая страница, а не корень: корень отвечает редиректом и был бы
  # «готов» ещё до того, как приложение способно что-то отрендерить.
  if curl -fsS --max-time 5 "http://127.0.0.1:$TARGET_PORT/en" -o /dev/null; then
    ready=1
    echo "[deploy] frontend-$TARGET ready after $((i * READY_INTERVAL))s"
    break
  fi
  sleep "$READY_INTERVAL"
done

if [ "$ready" -ne 1 ]; then
  echo "[deploy] FAILED: frontend-$TARGET did not answer in $((READY_ATTEMPTS * READY_INTERVAL))s." >&2
  echo "[deploy] Traffic was NOT switched — the site is still served by frontend-$CURRENT." >&2
  docker compose -f "$COMPOSE_FILE" logs --tail 50 "frontend-$TARGET" >&2 || true
  docker compose -f "$COMPOSE_FILE" stop "frontend-$TARGET" || true
  exit 1
fi

echo "[deploy] switching traffic to $TARGET"
printf 'reverse_proxy 127.0.0.1:%s\n' "$TARGET_PORT" | sudo tee "$UPSTREAM_FILE" >/dev/null

# `caddy reload` — не рестарт: он дослуживает открытые соединения на старом
# конфиге. Валидацию делаем отдельно и заранее, потому что упавший reload оставил
# бы Caddy на прошлом конфиге, а мы бы уже сочли выкат состоявшимся.
sudo caddy validate --config /etc/caddy/Caddyfile
sudo caddy reload --config /etc/caddy/Caddyfile --force

echo "[deploy] draining frontend-$CURRENT for ${DRAIN_SECONDS}s"
sleep "$DRAIN_SECONDS"
docker compose -f "$COMPOSE_FILE" stop "frontend-$CURRENT" || true

docker image prune -f
echo "[deploy] done: $TARGET is live"
