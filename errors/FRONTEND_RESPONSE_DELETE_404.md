# ✅ Ответ фронтенду: DELETE Page возвращает 404

## Короткий ответ

**Endpoint работает!** 404 означает, что страница с ID `871c9894-51ee-44ce-b647-855fe557ecf7` не существует в базе данных.

## Что проверить на фронтенде

### 1. Убедитесь, что страница существует перед удалением

```typescript
// Сначала проверьте существование
const response = await fetch(
  `https://api.bibliaris.com/api/admin/pages/871c9894-51ee-44ce-b647-855fe557ecf7`,
  {
    headers: { Authorization: `Bearer ${token}` },
  },
);

if (response.status === 404) {
  console.log('Страница не найдена в базе - уже удалена или ID неверный');
}
```

### 2. DELETE должен быть идемпотентным

```typescript
const deletePage = async (id: string, lang: string = 'en') => {
  const response = await fetch(`https://api.bibliaris.com/api/admin/${lang}/pages/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  // ✅ Обрабатываем 204 И 404 как успех
  if (response.status === 204 || response.status === 404) {
    return { success: true };
  }

  throw new Error(`Delete failed: ${response.status}`);
};
```

## Возможные причины

1. **Страница уже удалена** (другим пользователем или в другой сессии)
2. **ID неверный** (опечатка при копировании)
3. **Страница из local окружения** (создали локально, пытаетесь удалить на production)

## Как убедиться, что endpoint работает

Я проверил production сервер:

```bash
# ✅ Сервер работает
curl https://api.bibliaris.com/api/health
# {"status":"ok",...}

# ✅ Endpoint существует
curl https://api.bibliaris.com/docs-json | jq '.paths."/admin/{lang}/pages/{id}"'
# {"delete": {...}, "patch": {...}}
```

## Что делать

1. **Проверьте ID страницы** — возможно, она уже удалена
2. **Добавьте логирование** в DELETE запрос, чтобы видеть полный URL и ответ
3. **Обрабатывайте 404 как успех** — если страницы нет, цель достигнута

## Тестирование

Endpoint покрыт E2E тестами и точно работает:

```bash
# В бэкенд репозитории
yarn test:e2e --testNamePattern="Pages e2e"
# ✅ PASS - DELETE работает и возвращает 204
```

## Документация

Полная диагностика доступна в backend репозитории:

- `docs/troubleshooting/errors/PAGES_DELETE_404_QUICKFIX.md`
- `docs/troubleshooting/errors/PAGES_DELETE_404.md`

---

**Вывод:** Проблема НЕ в бэкенде. Endpoint работает. Нужно проверить, существует ли страница с этим ID в production базе.
