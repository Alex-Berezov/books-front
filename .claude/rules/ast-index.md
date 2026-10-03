# ast-index Rules

Инструмент структурного поиска по коду (AST-индекс в SQLite). Быстрее grep и
возвращает структурированный результат, поэтому экономит контекст.

## Когда что

Поиск символов, их использований, реализаций и структуры кода начинай с `ast-index`: он дешевле
по контексту, и его ответа на структурный вопрос обычно достаточно. Grep/Glob нужен, когда:

- `ast-index` вернул пустой результат;
- нужен regex (в `ast-index` — литеральное совпадение);
- ищем строковый литерал внутри кода (`"some text"`);
- ищем по содержимому комментариев;
- ищем в не-кодовых файлах (`.md`, `.scss`, `.json`, `.yaml`);
- ссылка живёт строкой, а не символом: путь в `vi.mock(...)`, ключ словаря в `t('...')`,
  адрес в `__tests__/msw/handlers.ts`.

## Command Reference

| Задача                | Команда                                 |
| --------------------- | --------------------------------------- |
| Универсальный поиск   | `ast-index search "query"`              |
| Класс / интерфейс     | `ast-index class "Name"`                |
| Символ                | `ast-index symbol "Name"`               |
| Использования         | `ast-index usages "Name"`               |
| Реализации интерфейса | `ast-index implementations "Interface"` |
| Дерево вызовов        | `ast-index call-tree "fn" --depth 3`    |
| Вызывающие            | `ast-index callers "fnName"`            |
| Аутлайн файла         | `ast-index outline "path/to/File.tsx"`  |
| Импорты файла         | `ast-index imports "path/to/File.tsx"`  |
| Файл по имени         | `ast-index file "PublishPanel"`         |
| TODO/FIXME            | `ast-index todo`                        |

## Next.js / React / TypeScript

| Задача                     | Команда                                  |
| -------------------------- | ---------------------------------------- |
| React-компонент            | `ast-index class "PublishPanel"`         |
| Хуки                       | `ast-index search "use" --kind function` |
| Props-типы / интерфейсы    | `ast-index class "Props"`                |
| Типы / DTO                 | `ast-index symbol "Dto"`                 |
| Где используется компонент | `ast-index usages "SlugInput"`           |

## Управление индексом

- `ast-index rebuild` — полная переиндексация (после clone или крупного merge).
- `ast-index update` — инкрементально; запускать после `git pull`, смены ветки
  и после серии собственных правок, **до** следующего поиска.
- `ast-index stats` — статистика индекса.

База индекса лежит вне репозитория
(`%LOCALAPPDATA%\ast-index\<hash>\index.db`), в `.gitignore` добавлять нечего.
