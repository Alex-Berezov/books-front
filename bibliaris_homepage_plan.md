# Homepage Overhaul — Plan

## Архитектура

Главная страница будет использовать систему Pages (как taxonomy overviews).
Добавляем `PageType.homepage` и храним структуру секций в JSON-поле `sections`.

### Backend (D:\newDev\books)

1. Prisma: добавить `homepage` в enum `PageType`
2. Prisma: добавить JSON-поле `sections` в модель `Page`
3. Создать миграцию
4. Обновить DTO (create/update page) для поддержки `sections`

### Frontend Admin (D:\newDev\books-front)

5. Обновить `PageForm` — добавить секцию для редактирования `sections` при типе `homepage`
6. В `PageListTable` показывать страницы типа `homepage`

### Frontend Public (D:\newDev\books-front)

7. `app/[lang]/page.tsx` — добавить `fetchPageBySlug('homepage-index')`
8. `HomeClient.tsx` — заменить хардкод на динамические данные из Page.sections
9. Добавить блоки: Categories, Genres, Collections, Themes, Why Bibliaris, About, FAQ
10. FAQPage JSON-LD

## Этапы

- [ ] **P1**: Prisma + DTO + миграция
- [ ] **P2**: Admin form (sections editor)
- [ ] **P3**: Обновить HomeClient — новые блоки
- [ ] **P4**: FAQ + JSON-LD
