# 🐛 404 при удалении страницы (DELETE /admin/:lang/pages/:id)

## Проблема

Фронтенд получает 404 при попытке удалить страницу:

```
DELETE /api/admin/en/pages/871c9894-51ee-44ce-b647-855fe557ecf7
Response: 404 Not Found
```

## ✅ Endpoint СУЩЕСТВУЕТ и РАБОТАЕТ

**Endpoint реализован и протестирован:**

```typescript
// src/modules/pages/pages.controller.ts, line 169
@Delete('admin/:lang/pages/:id')
@HttpCode(HttpStatus.NO_CONTENT)
@ApiOperation({ summary: 'Удалить страницу (админ)' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin, Role.ContentManager)
remove(@Param('lang', LangParamPipe) _lang: Language, @Param('id') id: string): Promise<any> {
  return this.service.remove(id);
}
```

**Документация:**

- `DELETE /admin/:lang/pages/:id` — Auth + Roles(admin|content_manager) — удалить (204)
- См. `/docs/api/endpoints.md`, раздел "18) Pages (CMS)"

**E2E тесты:**

- ✅ Тест проходит успешно: `test/pages.e2e-spec.ts`
- Endpoint корректно удаляет страницы и возвращает 204

## Возможные причины 404

### 1. ❌ Страница не существует в базе данных (САМАЯ ЧАСТАЯ ПРИЧИНА!)

Страница с ID `871c9894-51ee-44ce-b647-855fe557ecf7` может не существовать.

**Проверка (сначала получите страницу по ID):**

```bash
# Production
GET https://api.bibliaris.com/api/admin/pages/871c9894-51ee-44ce-b647-855fe557ecf7
Authorization: Bearer <your-token>

# Local
GET http://localhost:5000/api/admin/pages/871c9894-51ee-44ce-b647-855fe557ecf7
Authorization: Bearer <your-token>
```

**Ожидаемые результаты:**

- ✅ **200 OK** — страница существует, можно удалять
- ❌ **404 Not Found** — страницы нет в базе

**Если вернул 404:**

- ✅ Страница уже была удалена (цель достигнута!)
- ID неверный или скопирован с ошибкой
- Страница была создана в другой базе данных (например, в local, а вы проверяете production)
- Страница была создана в другом окружении

**💡 Рекомендация:** Это нормальная ситуация! DELETE должен быть идемпотентным - если страницы нет, это тоже успех.

### 2. ❌ Бэкенд-сервер не запущен (только для локальной разработки)

**⚠️ Только для local development! Production сервер работает на VPS (https://api.bibliaris.com)**

### 2. ❌ Бэкенд-сервер не запущен (только для локальной разработки)

**⚠️ Только для local development! Production сервер работает на VPS (https://api.bibliaris.com)**

**Проверка (только для local):**

```bash
curl http://localhost:5000/api/health
# Должен вернуть: {"status":"ok", ...}
```

**Решение (только для local):**

```bash
# В директории бэкенда:
yarn start:dev
```

### 3. ❌ Проблема с авторизацией

### 3. ❌ Проблема с авторизацией

Endpoint требует:

- JWT токен (Bearer)
- Роль: `admin` или `content_manager`

**Проверка:**

```bash
# Production
GET https://api.bibliaris.com/api/users/me
Authorization: Bearer <your-token>

# Local
GET http://localhost:5000/api/users/me
Authorization: Bearer <your-token>

# Должно вернуть:
{
  "id": "...",
  "email": "admin@example.com",
  "roles": ["user", "admin"] // или ["user", "content_manager"]
}
```

**Если нет нужной роли:**

- Обратитесь к администратору для выдачи роли
- См. документацию по управлению ролями в `/docs/api/endpoints.md`, раздел "2) Users"

### 4. ❌ Неправильный URL

**Правильный формат:**

```
DELETE /api/admin/:lang/pages/:id
```

**Примеры:**

```
✅ DELETE /api/admin/en/pages/871c9894-51ee-44ce-b647-855fe557ecf7
✅ DELETE /api/admin/es/pages/871c9894-51ee-44ce-b647-855fe557ecf7
❌ DELETE /api/pages/871c9894-51ee-44ce-b647-855fe557ecf7  // без admin/:lang
❌ DELETE /api/admin/pages/871c9894-51ee-44ce-b647-855fe557ecf7  // без :lang
```

## Диагностика: Пошаговая проверка

### Для Production (https://api.bibliaris.com)

### Шаг 1: Проверьте, что бэкенд работает

```bash
curl https://api.bibliaris.com/api/health
```

**Ожидается:**

```json
{
  "status": "ok",
  "uptime": 123.45,
  "timestamp": "2025-11-09T..."
}
```

### Шаг 2: Проверьте авторизацию

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.bibliaris.com/api/users/me
```

**Проверьте, что:**

- ✅ Статус 200
- ✅ В `roles` есть `admin` или `content_manager`

### Шаг 3: **Проверьте, что страница существует (ВАЖНО!)**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.bibliaris.com/api/admin/pages/871c9894-51ee-44ce-b647-855fe557ecf7
```

**Ожидается:**

- ✅ **200 + данные страницы** — страница существует, можно удалять
- ❌ **404** — **страницы нет в базе** (уже удалена или ID неверный)

**💡 Если получили 404 здесь — это объясняет 404 при DELETE!**

### Шаг 4: Попробуйте удалить

```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.bibliaris.com/api/admin/en/pages/871c9894-51ee-44ce-b647-855fe557ecf7
```

**Ожидается:**

- ✅ **204 No Content** — успешно удалено
- ❌ **404** — страница не найдена (см. Шаг 3)
- ❌ **401/403** — проблема с авторизацией (см. Шаг 2)

---

### Для Local Development (http://localhost:5000)

### Шаг 1: Проверьте, что бэкенд запущен

```bash
curl http://localhost:5000/api/health
```

**Ожидается:**

```json
{
  "status": "ok",
  "uptime": 123.45,
  "timestamp": "2025-11-09T..."
}
```

**Если не работает:**

```bash
# В директории бэкенда
yarn start:dev
```

### Шаг 2-4: То же самое, но с http://localhost:5000

## Типичные ошибки фронтенда

### ❌ Не обработана ситуация "страница уже удалена"

```typescript
// ❌ ПЛОХО: падаем с ошибкой при 404
const deletePage = async (id: string) => {
  const response = await fetch(`/api/admin/en/pages/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Delete failed'); // ❌ Не понятно, что случилось
  }
};

// ✅ ХОРОШО: обрабатываем 404 как успех
const deletePage = async (id: string) => {
  const response = await fetch(`/api/admin/en/pages/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 204) {
    // Успешно удалено
    return { success: true };
  }

  if (response.status === 404) {
    // Страница уже удалена или не существует
    // Это тоже успех - цель достигнута
    return { success: true, alreadyDeleted: true };
  }

  throw new Error(`Unexpected status: ${response.status}`);
};
```

### ❌ Кэширование старых данных

Если фронтенд кэширует список страниц, убедитесь, что:

- ✅ После DELETE инвалидируется кэш списка страниц
- ✅ При 404 на GET проверяется, не устарел ли кэш

## Рекомендации для фронтенда

### 1. Проверка перед удалением (опционально)

```typescript
// Проверяем, что страница существует перед удалением
const checkAndDelete = async (id: string) => {
  // Шаг 1: Проверяем существование
  const checkResponse = await fetch(`/api/admin/pages/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (checkResponse.status === 404) {
    console.warn(`Page ${id} already deleted or doesn't exist`);
    return { success: true, alreadyDeleted: true };
  }

  // Шаг 2: Удаляем
  const deleteResponse = await fetch(`/api/admin/en/pages/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (deleteResponse.status === 204) {
    return { success: true };
  }

  throw new Error(`Delete failed: ${deleteResponse.status}`);
};
```

### 2. Лог ошибок для диагностики

```typescript
const deletePage = async (id: string) => {
  try {
    const response = await fetch(`/api/admin/en/pages/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('[DELETE Page]', {
      id,
      status: response.status,
      ok: response.ok,
      url: response.url,
    });

    if (response.status === 204) return { success: true };
    if (response.status === 404) return { success: true, alreadyDeleted: true };

    // Логируем тело ошибки для диагностики
    const error = await response.json();
    console.error('[DELETE Page] Error:', error);
    throw new Error(`Delete failed: ${JSON.stringify(error)}`);
  } catch (error) {
    console.error('[DELETE Page] Exception:', error);
    throw error;
  }
};
```

## Проверка на production

На production бэкенд находится по адресу: `https://api.bibliaris.com`

**Проверка:**

```bash
# Health check
curl https://api.bibliaris.com/api/health

# Swagger документация
# https://api.bibliaris.com/docs

# Проверка страницы
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.bibliaris.com/api/admin/pages/YOUR_PAGE_ID

# Удаление
curl -X DELETE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.bibliaris.com/api/admin/en/pages/YOUR_PAGE_ID
```

## См. также

- [ENDPOINTS.md](/docs/api/endpoints.md) — Полная документация API
- [PAGES_404_GET_BY_ID.md](/docs/troubleshooting/errors/PAGES_404_GET_BY_ID.md) — Решение похожей проблемы с GET endpoint
- [PAGES_API_GUIDE.md](/docs/PAGES_API_GUIDE.md) — Подробное руководство по Pages API

## Резюме

✅ **Endpoint DELETE /admin/:lang/pages/:id РАБОТАЕТ на production и в тестах**

❌ **404 возникает, если:**

1. **Страница не существует в базе** (самая частая причина!)
2. Бэкенд не запущен (только local development)
3. Неправильная авторизация
4. Неправильный формат URL

🔧 **Решение:**

1. **ПЕРВОЕ: Проверьте, что страница существует** (`GET /api/admin/pages/:id`)
2. Если страницы нет — это нормально! DELETE идемпотентен
3. Если страница есть, но DELETE возвращает 404 — проверьте URL формат
4. Убедитесь, что у вас есть роль `admin` или `content_manager`
5. Для local: убедитесь, что dev-сервер запущен

💡 **Важно:** Если GET /admin/pages/:id возвращает 404, то и DELETE вернёт 404 — это ожидаемое поведение!
