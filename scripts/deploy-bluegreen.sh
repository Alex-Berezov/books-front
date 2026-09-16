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

# Пути и пороги читаются из окружения с боевым значением по умолчанию. Смысл
# не в настраиваемости — на сервере их никто не задаёт и не должен, — а в том,
# чтобы порядок шагов можно было прогнать тестом на подставных `caddy`, `docker`
# и `curl`: до 16.09.2026 этот скрипт не проверялся ничем, и `LEGACY-393` уехала
# на прод именно в его середине.
COMPOSE_DIR="${COMPOSE_DIR:-/opt/bibliaris-frontend/app/src}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
UPSTREAM_FILE="${UPSTREAM_FILE:-/etc/caddy/frontend-upstream.caddy}"
CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"

# Сколько ждать, пока новая версия начнёт отвечать. Next.js со standalone-сборкой
# поднимается за секунды, но холодный старт после `pull` бывает дольше.
READY_ATTEMPTS="${READY_ATTEMPTS:-60}"
READY_INTERVAL="${READY_INTERVAL:-2}"

# Пауза перед остановкой старой версии. Она не косметическая: отданный ранее HTML
# ссылается на ассеты со своим buildId (`/_next/static/<buildId>/…`), и они лежат
# только в том контейнере, который его отдал. Гасить его сразу — значит ловить
# 404 на чанках у тех, кто получил страницу за миг до переключения.
DRAIN_SECONDS="${DRAIN_SECONDS:-45}"

# Адреса и окно ожидания для проверки после переключения (`LEGACY-393`).
# `CADDY_ADMIN_URL` — admin API того же Caddy: он отдаёт ЗАГРУЖЕННЫЙ конфиг, то есть
# единственное место, где видно, применился reload или нет. `PUBLIC_URL` — вторая дверь,
# снаружи; `curl` к `127.0.0.1:<порт>` не годится ни для того, ни для другого:
# он щупает контейнер в обход Caddy.
CADDY_ADMIN_URL="${CADDY_ADMIN_URL:-http://localhost:2019}"
PUBLIC_URL="${PUBLIC_URL:-https://bibliaris.com}"
VERIFY_ATTEMPTS="${VERIFY_ATTEMPTS:-15}"
VERIFY_INTERVAL="${VERIFY_INTERVAL:-2}"

cd "$COMPOSE_DIR"

#
# ⚠️ Диапазон сужен до `300[12]` — тех двух портов, которыми оперирует сам выкат. Caddy
# на машине один и отдаёт `/config/` целиком, вместе с чужими сайтами; более широкий
# шаблон однажды прочитает чужой апстрим. Цена ошибки здесь не «красный выкат»,
# а наоборот: `cleanup_failed_target` считает «порт прочитан и не равен целевому»
# разрешением гасить контейнер. Поэтому несколько разных значений — это тоже
# «я не проверила», а не первое попавшееся.
#
# Коды возврата разведены намеренно: 1 — admin API не ответил, 2 — ответил, но порта
# фронта в загруженном конфиге нет. Это разные места поиска, и одна строка на оба
# отправила бы дежурного проверять доступность 2019 вместо содержимого конфига.
read_loaded_port() {
  local found=''
  found="$(curl -fsS --max-time 5 "$CADDY_ADMIN_URL/config/" \
    | grep -oE '127\.0\.0\.1:300[12]' | grep -oE '300[12]' | sort -u)" || return 1

  case "$found" in
    3001 | 3002) printf '%s' "$found" ;;
    *) return 2 ;;
  esac
}

# 🔴 LEGACY-393, признак переключения. Вердикт даёт ЗАГРУЖЕННЫЙ конфиг Caddy, а не то,
# что отвечает снаружи. Причина в том, что снаружи отвечает **ревизия образа**
# (`/api/version` отдаёт `APP_COMMIT_SHA`), а вопрос стоит про порт, на который смотрит
# Caddy. На повторном выкате одного коммита — Re-run jobs или `workflow_dispatch` —
# прежний контейнер несёт тот же SHA, и сверка по нему сходится с первой попытки даже
# при молча неприменившемся reload: проверка, которая не может не сойтись (`L-007`).
# Порт различает контейнеры всегда. Решение арбитра от 16.09.2026, `decisions-log.md`.
#
# Нечитаемый admin API, ответ не-JSON и нераспознанный порт — это исход «я не проверила»,
# то есть отказ выката (`L-015`), а не успех и не пропуск: именно ради этого различия
# `curl` идёт с `-f` и его код возврата разбирается, а не глушится.
# Ждёт, пока Caddy не начнёт держать в памяти порт $1. Возврат 1 — не дождались,
# в том числе когда admin API не ответил вовсе.
wait_for_loaded_port() {
  local want="$1" got=''
  for i in $(seq 1 "$VERIFY_ATTEMPTS"); do
    # Присваивание обёрнуто условием намеренно: голое `got="$(…)"` под `set -euo pipefail`
    # убило бы скрипт на первом же отказе `curl`, пропустив откат целиком.
    if ! got="$(read_loaded_port)"; then
      got=''
    fi
    if [ "$got" = "$want" ]; then
      echo "[deploy] Caddy держит порт $want (попытка $i)"
      return 0
    fi
    sleep "$VERIFY_INTERVAL"
  done
  echo "[deploy] за $((VERIFY_ATTEMPTS * VERIFY_INTERVAL))s Caddy не перешёл на порт $want (в памяти: ${got:-admin API не ответил})" >&2
  return 1
}

# Вторая дверь: настоящая страница по публичному адресу, через Cloudflare и Caddy.
# Её отказ валит выкат, но её успех переключения НЕ подтверждает и права гасить
# не даёт: ответ удовлетворяется из edge-кэша, а `Cache-Control` на границе Cloudflare
# решает не клиент. Вердикт остаётся за портом выше.
public_page_answers() {
  local i
  for i in $(seq 1 "$VERIFY_ATTEMPTS"); do
    if curl -fsS --max-time 10 -H 'Cache-Control: no-cache' "$PUBLIC_URL/en" -o /dev/null; then
      echo "[deploy] публичная страница отвечает (попытка $i)"
      return 0
    fi
    sleep "$VERIFY_INTERVAL"
  done
  echo "[deploy] за $((VERIFY_ATTEMPTS * VERIFY_INTERVAL))s $PUBLIC_URL/en так и не ответил" >&2
  return 1
}

# Уборка после неудачного выката. Гасить `frontend-$TARGET` можно только тогда, когда
# точно известно, что Caddy на него НЕ смотрит: иначе уборка сама роняет сайт — ровно
# то, что случилось 15.09.2026. Порт не прочитан или равен целевому — контейнер
# остаётся поднятым, а человек получает строку о том, где сейчас трафик.
cleanup_failed_target() {
  local loaded=''
  if ! loaded="$(read_loaded_port)"; then
    loaded=''
  fi

  if ! docker compose -f "$COMPOSE_FILE" logs --tail 50 "frontend-$TARGET" >&2; then
    echo "[deploy] ⚠️ логи frontend-$TARGET прочитать не удалось" >&2
  fi

  if [ -z "$loaded" ] || [ "$loaded" = "$TARGET_PORT" ]; then
    echo "[deploy] 🔴 frontend-$TARGET оставлен поднятым: Caddy держит ${loaded:-неизвестно что}, гасить его нельзя." >&2
    echo "[deploy] 🔴 Оба контейнера живы. Нужен человек: вернуть upstream на рабочий порт и перезагрузить Caddy." >&2
    return 0
  fi

  if ! docker compose -f "$COMPOSE_FILE" stop "frontend-$TARGET"; then
    echo "[deploy] ⚠️ frontend-$TARGET не остановлен — он остался поднятым на порту $TARGET_PORT" >&2
  fi
}

# Возврат 1 наружу: под `set -e` голый вызов оборвал бы скрипт прямо здесь, оставив
# состояние «файл говорит про новый порт, Caddy живёт на старом». Файл объявлен
# единственным источником правды, и следующий выкат посчитал бы по нему `current_port`
# наоборот — пересоздав обслуживающий трафик контейнер. Поэтому каждый вызов
# `switch_upstream` ниже стоит под условием.
switch_upstream() {
  if ! printf 'reverse_proxy 127.0.0.1:%s\n' "$1" | sudo tee "$UPSTREAM_FILE" >/dev/null; then
    echo "[deploy] upstream-файл $UPSTREAM_FILE не записан" >&2
    return 1
  fi
  # `caddy reload` — не рестарт: он дослуживает открытые соединения на старом
  # конфиге. Валидацию делаем отдельно и заранее, потому что упавший reload оставил
  # бы Caddy на прошлом конфиге, а мы бы уже сочли выкат состоявшимся.
  sudo caddy validate --config "$CADDYFILE" || return 1
  sudo caddy reload --config "$CADDYFILE" --force || return 1
}

# Откат в состояние до выката и выход с ошибкой. Прежний контейнер всё это время
# работает: его гасят только в самом низу и только после подтверждения.
fail_and_rollback() {
  echo "[deploy] FAILED: $1" >&2

  if [ -z "$PREVIOUS_PORT" ]; then
    # Пусто не только на первом запуске: `grep` даёт пусто и на upstream-файле,
    # правленом руками, о чём предупреждает шапка этого скрипта.
    echo "[deploy] Откатывать некуда: прежний порт из upstream-файла не прочитан." >&2
  else
    echo "[deploy] возвращаю upstream на порт $PREVIOUS_PORT (frontend-$CURRENT)" >&2
    if ! switch_upstream "$PREVIOUS_PORT"; then
      echo "[deploy] ⚠️ откатный reload завершился ошибкой" >&2
    fi
    if wait_for_loaded_port "$PREVIOUS_PORT"; then
      echo "[deploy] откат подтверждён: Caddy снова на порте $PREVIOUS_PORT, сайт жив" >&2
    else
      echo "[deploy] 🔴 откат не подтвердился — Caddy мог остаться на порте новой версии" >&2
    fi
  fi

  cleanup_failed_target

  # Итоговая строка читается первой, когда приходят чинить, и потому обязана
  # совпадать с тем, что прочитано у Caddy. Иначе человек вернёт upstream не туда.
  local loaded=''
  if ! loaded="$(read_loaded_port)"; then
    loaded=''
  fi
  if [ -n "$loaded" ] && [ "$loaded" = "$PREVIOUS_PORT" ]; then
    echo "[deploy] Traffic was NOT switched — the site is still served by frontend-$CURRENT." >&2
  else
    echo "[deploy] 🔴 Трафик остался на frontend-$TARGET (Caddy держит ${loaded:-неизвестно что})." >&2
  fi
  exit 1
}

# Кто сейчас наверху. Спрашиваем сам Caddy: до 16.09.2026 источником служил
# upstream-файл, но правка этого же захода завела состояние, в котором файл и
# загруженный конфиг расходятся — неудавшийся откат оставляет файл на прежнем порте,
# а Caddy на целевом. Прочитав в таком состоянии файл, следующий выкат выбрал бы целью
# работающий контейнер и пересоздал его: `LEGACY-393` во второй раз, уже своими руками.
# Файл остаётся запасным источником — на случай молчащего admin API на первом запуске.
current_port=''
if ! current_port="$(read_loaded_port)"; then
  current_port=''
fi

# Файла может не быть вовсе (первый запуск) — это не отказ, а пустое значение.
file_port=''
if ! file_port="$(grep -oE '300[12]' "$UPSTREAM_FILE" 2>/dev/null | head -1)"; then
  file_port=''
fi

if [ -z "$current_port" ]; then
  current_port="$file_port"
elif [ -n "$file_port" ] && [ "$file_port" != "$current_port" ]; then
  echo "[deploy] FAILED: upstream-файл указывает на $file_port, а Caddy держит $current_port." >&2
  echo "[deploy] Выкат не начат: в этом состоянии целью стал бы работающий контейнер." >&2
  echo "[deploy] Нужен человек: привести файл и загруженный конфиг к одному порту." >&2
  exit 1
fi

# Порт, на котором трафик стоял до выката. Нужен для отката: если новая версия
# так и не появилась снаружи, upstream возвращается сюда, а не остаётся висеть
# на порту, который вот-вот погаснет. Пусто на первом запуске — откатывать некуда.
PREVIOUS_PORT="$current_port"

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
  cleanup_failed_target
  exit 1
fi

echo "[deploy] switching traffic to $TARGET"
if ! switch_upstream "$TARGET_PORT"; then
  fail_and_rollback "не удалось переключить upstream на порт $TARGET_PORT"
fi

# Повтор ровно один: reload стоит около двадцати миллисекунд и не рвёт соединений,
# поэтому лишняя попытка дешевле красного выката. Дальше повторять нечем — отказ,
# переживший две попытки, уже не похож на разовый.
if ! wait_for_loaded_port "$TARGET_PORT"; then
  echo "[deploy] reload завершился успешно, но конфиг не применился — повторяю переключение" >&2

  if ! switch_upstream "$TARGET_PORT"; then
    fail_and_rollback "повторное переключение upstream на порт $TARGET_PORT не удалось"
  fi

  if ! wait_for_loaded_port "$TARGET_PORT"; then
    fail_and_rollback "после двух попыток Caddy так и не перешёл на порт $TARGET_PORT"
  fi
fi

# Переключение состоялось. Вторая дверь — снаружи: она ловит поломку, которая живёт
# между Cloudflare и Caddy и потому невидима с самой машины.
if ! public_page_answers; then
  fail_and_rollback "Caddy перешёл на порт $TARGET_PORT, но снаружи сайт не отвечает"
fi

echo "[deploy] draining frontend-$CURRENT for ${DRAIN_SECONDS}s"
sleep "$DRAIN_SECONDS"
docker compose -f "$COMPOSE_FILE" stop "frontend-$CURRENT" || true

docker image prune -f
echo "[deploy] done: $TARGET is live"
