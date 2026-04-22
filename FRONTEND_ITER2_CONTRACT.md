# Ответное ТЗ для фронта: Audio books Iteration 2 (Bibliaris backend)

> **Проект:** Bibliaris (books-app-back)
> **Автор:** бэкенд-агент
> **Дата:** 22 апреля 2026
> **Base URL (prod):** `https://api.bibliaris.com/api`
> **Base URL (local dev):** `http://localhost:5000/api`
> **Git commit:** `710704b` (полностью задеплоен на прод)
> **Связанные документы:**
>
> - `BACKEND_TZ.md` — входящее ТЗ от фронта (этот ответ закрывает все пункты must-have + should-have + nice-to-have).
> - `books-docs/backend/api/endpoints.md`, `books-docs/backend/guides/media-library.md`, `books-docs/frontend/ENDPOINTS.md` — требуют обновления (см. § 10).

---

## 1. TL;DR — что изменилось и готово к использованию

| Категория            | Что сделано                                                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AudioChapter**     | Добавлены поля `description`, `transcript`, `mediaId` (FK на `MediaAsset`). Есть reorder-эндпоинт. Есть admin-эндпоинты для draft-версий.                            |
| **MediaAsset**       | Добавлено поле `duration` (секунды) — автоматически считается через ffprobe для `audio/*` и `video/*` при `POST /media/confirm`. Добавлен soft-delete (`deletedAt`). |
| **Uploads**          | Лимит аудио-файлов поднят до **200 MB**. Добавлен публичный эндпоинт `GET /uploads/limits` для обнаружения лимитов и whitelisted MIME-типов клиентом.                |
| **BookVersion**      | Добавлено опциональное поле `previewMediaId` (FK на `MediaAsset`). Публичный эндпоинт `GET /versions/:id/preview` отдаёт preview audio.                              |
| **Admin media jobs** | `POST /admin/media/reprobe` — backfill durations; `POST /admin/media/probe?id=` — единичный probe; `POST /admin/media/cleanup-orphans?dryRun=true` — orphan cleanup. |
| **Валидация**        | `number` unique per version → 409 с полем `field: "number"`; `title` 1..255; `duration` 0..86400; `description` ≤ 5000; `audioUrl` — http(s).                        |
| **OpenAPI/Swagger**  | `/api/docs` (UI) и `/api/docs-json` — обновлены. Фронт может генерировать типы через `yarn openapi:types:prod`.                                                      |

**Breaking changes:** нет. Все новые поля **опциональные**, существующие ответы DTO расширены (backward-compatible).

---

## 2. Base URL и префикс

- Глобальный префикс API: `/api` (устанавливается в `main.ts` через `setGlobalPrefix('api')`).
- Пример: `https://api.bibliaris.com/api/versions/{id}/audio-chapters`.
- Health: `GET /api/health` → 200.
- Swagger UI: `https://api.bibliaris.com/api/docs`, JSON: `https://api.bibliaris.com/api/docs-json`.

---

## 3. AudioChapter — полный контракт

### 3.1. DTO

```ts
interface AudioChapter {
  id: string; // UUID
  bookVersionId: string; // UUID
  number: number; // int >= 1, unique within bookVersionId
  title: string; // 1..255
  audioUrl: string; // http(s)://...
  mediaId: string | null; // FK -> MediaAsset.id (опционально)
  duration: number; // seconds, int 0..86400
  description: string | null; // ≤ 5000 символов
  transcript: string | null; // polno-tekst (опционально, без жесткого лимита по символам — сейчас text)
  createdAt: string; // ISO
  updatedAt: string; // ISO
}
```

### 3.2. Create / Update DTO

```ts
// POST /versions/:bookVersionId/audio-chapters
interface CreateAudioChapterDto {
  number: number; // required, int >= 1
  title: string; // required, 1..255
  audioUrl: string; // required, http(s)://...
  mediaId?: string | null; // опц. UUID
  duration: number; // required, int 0..86400
  description?: string | null; // опц., ≤ 5000
  transcript?: string | null; // опц.
}

// PATCH /audio-chapters/:id (публичный маршрут, auth+roles)
// PATCH /admin/audio-chapters/:id — НЕТ, редактирование идёт по обычному маршруту
interface UpdateAudioChapterDto {
  number?: number;
  title?: string;
  audioUrl?: string;
  mediaId?: string | null;
  duration?: number;
  description?: string | null;
  transcript?: string | null;
}
```

**Поведение валидации:**

- `ValidationPipe` настроен с `whitelist: true, forbidNonWhitelisted: true, transform: true` — **любое неизвестное поле → 400**.
- Дубликат `number` в пределах версии → **409 Conflict** с телом:
  ```json
  {
    "statusCode": 409,
    "error": "Conflict",
    "message": "Audio chapter with number 1 already exists in this version",
    "field": "number"
  }
  ```

### 3.3. Публичные эндпоинты

| Метод    | Путь                                                   | Доступ                   | Описание                                                                           |
| -------- | ------------------------------------------------------ | ------------------------ | ---------------------------------------------------------------------------------- |
| `GET`    | `/versions/:bookVersionId/audio-chapters?page=&limit=` | Public                   | Список глав. **Только для published версий** (иначе 404). Сортировка `number ASC`. |
| `GET`    | `/audio-chapters/:id`                                  | Public                   | Одна глава. Только если родитель published.                                        |
| `POST`   | `/versions/:bookVersionId/audio-chapters`              | admin \| content_manager | Создать.                                                                           |
| `PATCH`  | `/audio-chapters/:id`                                  | admin \| content_manager | Обновить (любые поля).                                                             |
| `DELETE` | `/audio-chapters/:id`                                  | admin \| content_manager | Удалить (204). Best-effort soft-delete связанного `MediaAsset` (см. § 7.2).        |
| `POST`   | `/versions/:bookVersionId/audio-chapters/reorder`      | admin \| content_manager | Массовое переупорядочивание.                                                       |

### 3.4. Admin-эндпоинты (для draft-версий)

| Метод | Путь                                                         | Доступ                   | Описание                                    |
| ----- | ------------------------------------------------------------ | ------------------------ | ------------------------------------------- |
| `GET` | `/admin/versions/:bookVersionId/audio-chapters?page=&limit=` | admin \| content_manager | Список глав **для версий в любом статусе**. |
| `GET` | `/admin/audio-chapters/:id`                                  | admin \| content_manager | Одна глава, независимо от статуса версии.   |

> Для редактирования админам **не нужны отдельные admin-мутации** — `POST/PATCH/DELETE` работают для любой версии (auth + role check).

### 3.5. Пагинация

Унифицированный формат (как в других листах):

```json
{
  "items": [
    /* AudioChapter[] */
  ],
  "total": 17,
  "page": 1,
  "limit": 50
}
```

- `page`: int ≥ 1, default 1.
- `limit`: int 1..100, default 50.
- Язык главы определяется родительской `BookVersion.language` — параметр `language` в запросах глав не принимается.

### 3.6. Reorder

```http
POST /api/versions/:bookVersionId/audio-chapters/reorder
Authorization: Bearer <token>
Content-Type: application/json

{ "audioChapterIds": ["ac_1", "ac_2", "ac_3"] }
```

**Поведение:**

- Атомарная транзакция: обновляет `number` у всех глав в порядке массива (начиная с 1).
- Массив **должен содержать все главы данной версии** и только их. Иначе 400.
- Ответ: `AudioChapter[]` в новом порядке.
- При дубликатах/пропусках → 400 с пояснением.

---

## 4. MediaAsset — обновлённый контракт

### 4.1. DTO

```ts
interface MediaAsset {
  id: string; // UUID
  key: string; // уникальный ключ в сторадже
  url: string; // публичный URL
  contentType: string | null; // e.g. "audio/mpeg"
  size: number | null; // bytes
  width: number | null;
  height: number | null;
  duration: number | null; // NEW: seconds, int (заполняется ffprobe для audio/* и video/*)
  createdAt: string;
  createdById: string;
  isDeleted: boolean;
  deletedAt: string | null; // NEW: ISO, soft-delete timestamp
}
```

### 4.2. Автоматическое определение длительности

- При `POST /media/confirm` (после presigned uploada) для `contentType` начинающегося с `audio/` или `video/` сервер **автоматически** запускает ffprobe (через `@ffprobe-installer/ffprobe`, статический бинарь).
- Результат записывается в `MediaAsset.duration` **асинхронно**: первый `confirm` может вернуть `duration: null`, следующий `GET /media/:id` или повторный запрос вернёт реальное значение (обычно < 500 мс после confirm).
- Если доступен Redis — probe уходит в BullMQ-очередь; иначе выполняется inline в том же процессе (best-effort, не блокирует ответ).
- Если ffprobe упадёт — `duration` останется `null`, запрос `confirm` успешен (не блокирует пользовательский флоу).

### 4.3. Upload limits endpoint (новое)

```http
GET /api/uploads/limits
```

**Public, без авторизации.** Возвращает:

```json
{
  "image": {
    "maxSizeMb": 5,
    "allowedContentTypes": ["image/jpeg", "image/png", "image/webp"]
  },
  "audio": {
    "maxSizeMb": 200,
    "allowedContentTypes": ["audio/mpeg", "audio/mp4", "audio/aac", "audio/ogg"]
  },
  "presignTtlSec": 600
}
```

**Как использовать фронту:**

1. При загрузке строки клиент вытягивает `GET /uploads/limits` один раз (кэшировать на сессию).
2. Валидировать размер **до** начала загрузки:
   - Аудио > `audio.maxSizeMb` MB → показать ошибку локально, не отправлять запрос.
   - MIME не в `allowedContentTypes` → показать ошибку.
3. Эти значения также применяются на бэке (multer + controller checks). Серверные коды ошибок:
   - **413 Payload Too Large** — превышен размер.
   - **415 Unsupported Media Type** — неподдерживаемый MIME.
   - **429 Too Many Requests** — rate-limit (глобальный throttler).

### 4.4. Upload flow (без изменений — для справки)

**Вариант А: one-step (предпочтительный для маленьких файлов и админки):**

```
POST /media/upload (multipart, field=file) → MediaAsset
```

**Вариант Б: presigned (для больших файлов > ~20 MB):**

```
POST /uploads/presign { key, contentType, size }      → { token, url, key }
POST /uploads/direct  (Bearer <token>, binary body)   → 204
POST /media/confirm   { key, contentType, size }      → MediaAsset
```

- Для аудио рекомендуется **Вариант Б** — это корректно триггерит ffprobe и не блокирует node-процесс на время загрузки.

---

## 5. BookVersion — preview audio

### 5.1. Поле в DTO

```ts
interface BookVersion {
  // ... existing fields
  previewMediaId: string | null; // NEW: FK -> MediaAsset.id, onDelete: SetNull
}
```

### 5.2. Назначение / обновление preview

```http
PATCH /api/versions/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "previewMediaId": "m_xxx" }   // назначить
{ "previewMediaId": null }      // снять
```

**Валидация бэка:**

- `previewMediaId` должен быть валидным UUID (или `null`).
- Связанный `MediaAsset` должен существовать, не быть soft-deleted, и иметь `contentType` начинающийся с `audio/` — иначе **400 Bad Request**.

### 5.3. Получение preview (публично)

```http
GET /api/versions/:id/preview
```

**Public, без авторизации.**

**Ответ 200:**

```json
{
  "previewUrl": "https://cdn.bibliaris.com/audio/sample.mp3",
  "duration": 62,
  "contentType": "audio/mpeg"
}
```

**Ответ 404:**

- если `BookVersion` не найдена / soft-deleted;
- если `previewMediaId` не задан или связанный `MediaAsset` удалён.

> Используйте это для UI "Послушать отрывок" на странице книги. Preview отдаётся публично даже для **платных** версий.

---

## 6. Admin media jobs

Базовый префикс: `/api/admin/media`. Доступ: `admin` only.

### 6.1. Reprobe (backfill durations)

```http
POST /api/admin/media/reprobe
Authorization: Bearer <admin-token>
```

**Поведение:** перечислить все `MediaAsset` где `contentType LIKE 'audio/%' OR 'video/%'` и `duration IS NULL` и `isDeleted = false`, и поставить в очередь на probe. Возвращает:

```json
{ "enqueued": 42 }
```

Использовать: один раз после деплоя для старых файлов (на проде сейчас аудио-файлов нет → backfill не требуется).

### 6.2. Single probe

```http
POST /api/admin/media/probe?id=<mediaAssetId>
```

Поставить один файл в очередь. Возвращает `{ "enqueued": true }` либо 404 если не найден.

### 6.3. Orphan cleanup

```http
POST /api/admin/media/cleanup-orphans?dryRun=true&softDays=7&hardDays=30
```

**Query params (все опциональны):**

- `dryRun` (bool, default `false`) — только посчитать, ничего не менять.
- `softDays` (int, default 7) — soft-delete файлов без ссылок, старше N дней после создания.
- `hardDays` (int, default 30) — полное удаление уже soft-deleted файлов старше N дней после `deletedAt`.

**Ответ:**

```json
{
  "softDeleted": 3,
  "hardDeleted": 0,
  "candidates": [
    /* при dryRun=true */
  ]
}
```

**Что считается «orphan»:** `MediaAsset` без связей с `AudioChapter` **и** без ссылок из `BookVersion.previewMediaId` (аналогичные проверки могут расширяться при добавлении новых FK).

### 6.4. Автоматический cron

- Cron-воркер включается env-флагами на бэке (`MEDIA_CLEANUP_ENABLED=true`, `MEDIA_CLEANUP_CRON="0 3 * * *"`). На проде **сейчас отключён по умолчанию**.
- Фронт знать об этом не обязан — эндпоинт `/admin/media/cleanup-orphans` работает независимо.

---

## 7. Побочные соглашения

### 7.1. `source` в `POST /views`

Не менялось. Поле `source` — строка в ENUM бэка: `reader` (текст) | `audio` (прослушивание) | `referral`. Фронт для аудио-плеера должен слать `source: "audio"`.

### 7.2. Orphan media при удалении главы

При `DELETE /audio-chapters/:id`:

- Связанный `MediaAsset` **не удаляется автоматически** в транзакции.
- Cleanup делает отдельный процесс (см. § 6.3).
- Логика: если фронт не уверен — полагайтесь на cleanup, ничего дополнительно дёргать не нужно.

### 7.3. Reading Progress для аудио

`PUT /api/me/progress/:versionId` принимает:

```ts
{
  audioChapterNumber?: number;  // int, существующий number в пределах версии
  position?: number;            // seconds, float >= 0 (позиция воспроизведения)
  // ... + text-поля (chapterNumber, paragraphIndex)
}
```

- `position` для аудио — **секунды** (float).
- Валидация: `position >= 0`, `audioChapterNumber` должен существовать в версии.

### 7.4. Comments с target=audio

Без изменений: `POST /comments { audioChapterId, text, parentId? }`.

---

## 8. Примеры запросов

### 8.1. Создать главу

```http
POST /api/versions/ver_abc/audio-chapters
Authorization: Bearer <token>
Content-Type: application/json

{
  "number": 1,
  "title": "Chapter 1: The Boy Who Lived",
  "audioUrl": "https://cdn.bibliaris.com/audio/hp1/ch1.mp3",
  "mediaId": "m_xyz",
  "duration": 1860,
  "description": "Introduction to Harry Potter's world.",
  "transcript": "Mr. and Mrs. Dursley, of number four..."
}
```

**201:**

```json
{
  "id": "ac_456",
  "bookVersionId": "ver_abc",
  "number": 1,
  "title": "Chapter 1: The Boy Who Lived",
  "audioUrl": "https://cdn.bibliaris.com/audio/hp1/ch1.mp3",
  "mediaId": "m_xyz",
  "duration": 1860,
  "description": "Introduction to Harry Potter's world.",
  "transcript": "Mr. and Mrs. Dursley, of number four...",
  "createdAt": "2026-04-22T10:00:00.000Z",
  "updatedAt": "2026-04-22T10:00:00.000Z"
}
```

### 8.2. Reorder

```http
POST /api/versions/ver_abc/audio-chapters/reorder
Authorization: Bearer <token>
Content-Type: application/json

{ "audioChapterIds": ["ac_3", "ac_1", "ac_2"] }
```

→ 200 с массивом, где у `ac_3` теперь `number: 1`, у `ac_1` — `2`, у `ac_2` — `3`.

### 8.3. Назначить preview аудио

```http
PATCH /api/versions/ver_abc
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "previewMediaId": "m_preview_xyz" }
```

→ 200 `BookVersion`.

Публично:

```http
GET /api/versions/ver_abc/preview
```

→ 200

```json
{
  "previewUrl": "https://cdn.bibliaris.com/…/preview.mp3",
  "duration": 45,
  "contentType": "audio/mpeg"
}
```

### 8.4. Получить лимиты и провалидировать upload локально

```ts
// один раз при старте
const limits = await api.get<{ image: Limit; audio: Limit; presignTtlSec: number }>(
  '/uploads/limits'
);

function validateAudioFile(file: File, limits: Limits) {
  const max = limits.audio.maxSizeMb * 1024 * 1024;
  if (file.size > max) throw new Error(`Файл слишком большой (> ${limits.audio.maxSizeMb} MB)`);
  if (!limits.audio.allowedContentTypes.includes(file.type))
    throw new Error(`MIME ${file.type} не поддерживается`);
}
```

---

## 9. Коды ошибок — сводка

| Код | Когда                                                      | Тело                                    |
| --- | ---------------------------------------------------------- | --------------------------------------- |
| 400 | Плохой DTO (`forbidNonWhitelisted`, некорректные типы)     | `{ statusCode, error, message }`        |
| 401 | Нет/плохой JWT                                             | стандартное Nest                        |
| 403 | Роль недостаточна                                          | стандартное Nest                        |
| 404 | Объект не найден или доступ запрещён (draft для не-админа) | стандартное Nest                        |
| 409 | Дубликат (`number` в reorder/create)                       | `{ statusCode, error, message, field }` |
| 413 | Upload слишком большой                                     | стандартное Nest                        |
| 415 | MIME не whitelisted                                        | стандартное Nest                        |
| 429 | Rate-limit                                                 | `Retry-After` в заголовке               |
| 500 | Внутренняя ошибка (алерт в Sentry)                         | `{ statusCode, error, message }`        |

---

## 10. Что обновить в `books-docs` (для человека)

> MCP-инструмент `readDoc` у меня сейчас сломан (Access denied), поэтому обновления делать вручную. Ниже перечень файлов, которые надо привести в соответствие.

### 10.1. `books-docs/backend/api/endpoints.md`

- Раздел **Audio Chapters** — добавить `description`, `transcript`, `mediaId` в DTO; добавить `POST /versions/:bookVersionId/audio-chapters/reorder`; добавить admin-эндпоинты `GET /admin/versions/:bookVersionId/audio-chapters`, `GET /admin/audio-chapters/:id`.
- Раздел **Media** — добавить `duration`, `deletedAt`, `isDeleted` в MediaAsset DTO; добавить `GET /uploads/limits`; добавить `POST /admin/media/{reprobe, probe, cleanup-orphans}`.
- Раздел **Book Versions** — добавить `previewMediaId` в DTO и `GET /versions/:id/preview`.

### 10.2. `books-docs/backend/guides/media-library.md`

- Секция "Модель данных" — добавить `duration`, `deletedAt`.
- Секция "Лимиты" — `UPLOADS_MAX_AUDIO_MB=200` (prod-дефолт), `/uploads/limits` как источник истины.
- Новая секция "Duration probe (ffprobe)" — как работает, какие env-флаги (`BULLMQ_IN_PROCESS_WORKER`, `MEDIA_CLEANUP_ENABLED`, `MEDIA_CLEANUP_CRON`), fallback inline.
- Новая секция "Orphan cleanup" — поведение, стратегия soft/hard delete.

### 10.3. `books-docs/frontend/ENDPOINTS.md` и `books-docs/frontend/frontend-agents/backend-api-reference.md`

- Синхронизация с бэкенд-изменениями (зеркалит § 3-6 этого документа).
- После мёрджа: `yarn openapi:types:prod` для регенерации типов.

### 10.4. `books-docs/backend/frontend-related/ADMIN_UI_SPEC.md`

- Экран AudioChapter — поля `description`, `transcript` (textarea, markdown), указание на reorder drag-and-drop.
- Экран BookVersion — выбор preview из медиа-библиотеки.

---

## 11. Чек-лист из входящего ТЗ — закрытие

- [x] Подтвердить текущую схему `AudioChapter` DTO → см. § 3.1.
- [x] Добавить `description?: string` → реализовано, ≤ 5000.
- [x] Обсудить `transcript?: string` → **добавлено** (тип `text`, без жёсткого лимита).
- [x] Рассмотреть `mediaId` FK → **добавлено** как опциональный UUID.
- [x] Документировать валидации (`number` unique, `title` 1..255, `duration` 0..86400) → § 3.2.
- [x] Admin-эндпоинты для draft-версий → § 3.4.
- [x] `POST /versions/:id/audio-chapters/reorder` → § 3.6.
- [x] Лимит ≥ 200 MB → prod `UPLOADS_MAX_AUDIO_MB=200`.
- [x] Whitelist MIME + коды ошибок → § 4.3, § 9.
- [x] `duration` в MediaAsset DTO → § 4.1, автопрefill через ffprobe в § 4.2.
- [x] `source` в `POST /views` для аудио → § 7.1 (без изменений, `audio`).
- [x] Preview-audio для платных книг → § 5.
- [x] Обновить Swagger/OpenAPI — `/api/docs`, `/api/docs-json` обновлены.
- [ ] **Обновить `books-docs`** — см. § 10, делается вручную.

---

## 12. Prod-статус (на 22.04.2026 10:45 UTC)

- Commit: `710704b` (Iter 2 + всех фиксах E2E).
- Docker image `books-app:prod`: пересобран, контейнер `src-app-1` healthy.
- Миграция `20260421120000_add_media_duration_and_preview` применена.
- `.env.prod`: `UPLOADS_MAX_AUDIO_MB=200`.
- `GET https://api.bibliaris.com/api/uploads/limits` → 200, `audio.maxSizeMb=200`.
- В БД **0 аудио-файлов** → backfill durations не требуется.

**Фронт может стартовать на новых эндпоинтах прямо сейчас.**
