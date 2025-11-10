# 🚨 Quick Fix: DELETE /admin/:lang/pages/:id возвращает 404

## TL;DR

✅ **Endpoint работает!** Проблема НЕ в бэкенде.

🎯 **Самая частая причина:** Страница с таким ID не существует в базе данных (уже удалена или ID неверный)

🔍 **Проверьте:**

```bash
# Production сервер
# 1. Страница существует?
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.bibliaris.com/api/admin/pages/YOUR_PAGE_ID

# 2. Правильный URL?
DELETE /api/admin/en/pages/YOUR_PAGE_ID  # ✅
DELETE /api/pages/YOUR_PAGE_ID           # ❌

# Локальная разработка
# 1. Бэкенд запущен?
curl http://localhost:5000/api/health

# 2. Страница существует?
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/admin/pages/YOUR_PAGE_ID
```

## Причины 404

| Причина                             | Как проверить                           | Решение                                                                 |
| ----------------------------------- | --------------------------------------- | ----------------------------------------------------------------------- |
| 🔴 **Страница не существует**       | `GET /api/admin/pages/{id}` вернёт 404  | **Самая частая причина!** Проверьте ID, страница могла быть уже удалена |
| 🔴 Нет прав (роли)                  | `GET /api/users/me` → проверьте `roles` | Нужна роль `admin` или `content_manager`                                |
| 🔴 Неправильный URL                 | Проверьте формат URL                    | Должно быть: `/api/admin/:lang/pages/:id`                               |
| 🔴 Бэкенд не запущен (только local) | `curl http://localhost:5000/api/health` | `yarn start:dev` в папке бэкенда                                        |

## Код для фронтенда

```typescript
// ✅ Правильно: обрабатываем все случаи
const deletePage = async (id: string, lang: string = 'en') => {
  const url = `/api/admin/${lang}/pages/${id}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${yourToken}`,
    },
  });

  // 204 = успешно удалено
  if (response.status === 204) {
    return { success: true };
  }

  // 404 = уже удалено или не существует
  if (response.status === 404) {
    console.warn(`Page ${id} not found (already deleted?)`);
    return { success: true, alreadyDeleted: true };
  }

  // Другая ошибка
  const error = await response.json().catch(() => ({}));
  throw new Error(`Delete failed (${response.status}): ${JSON.stringify(error)}`);
};
```

## Проверка E2E

```bash
# Бэкенд покрыт тестами, endpoint точно работает:
cd backend-repo
yarn test:e2e --testNamePattern="Pages e2e"
# ✅ PASS  test/pages.e2e-spec.ts
```

## Полная документация

📖 [PAGES_DELETE_404.md](./PAGES_DELETE_404.md) — Подробная диагностика
📖 [ENDPOINTS.md](/docs/api/endpoints.md) — Все API endpoints
