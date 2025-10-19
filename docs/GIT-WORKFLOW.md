# Git Workflow для разработки фронтенда

> Правила работы с Git на протяжении всего проекта

---

## 🔥 Основное правило

**ПОСЛЕ КАЖДОЙ ЗАВЕРШЁННОЙ ПОДЗАДАЧИ — ОБЯЗАТЕЛЬНЫЙ PUSH В GITHUB**

Это означает:
- ✅ Завершили M0.4 → commit + push
- ✅ Завершили M0.5 → commit + push
- ✅ Завершили M1.1 → commit + push
- И так далее для **каждой** подзадачи из `TASKS-TRACKING.md`

---

## 📋 Процедура после каждой подзадачи

### 1. Проверка готовности

Перед коммитом убедитесь:

```bash
# Проверка типов
yarn typecheck

# Проверка линтера
yarn lint

# Опционально: форматирование
yarn format
```

Все команды должны пройти **без ошибок**.

### 2. Коммит изменений

Используйте **Conventional Commits** формат:

```bash
git add .
git commit -m "тип: краткое описание (номер подзадачи)

- Детальное описание изменения 1
- Детальное описание изменения 2
- Что было добавлено/исправлено

Closes M0.4"
```

**Типы коммитов:**
- `feat:` — новая функциональность
- `fix:` — исправление бага
- `docs:` — изменения в документации
- `style:` — форматирование, стили (не влияют на код)
- `refactor:` — рефакторинг кода
- `test:` — добавление тестов
- `chore:` — обновление зависимостей, конфигураций

**Примеры:**

```bash
# M0.4
git commit -m "feat: add language switcher components (M0.4)

- LanguageSwitcher for public site
- AdminLanguageSwitcher for admin panel  
- URL language switching with validation

Closes M0.4"

# M0.5
git commit -m "feat: add NextAuth stub configuration (M0.5)

- NextAuth config structure
- Session/JWT type definitions
- Auth provider setup (no real auth yet)

Closes M0.5"

# M1.2
git commit -m "feat: implement NextAuth credentials provider (M1.2)

- Credentials provider with /api/auth/login
- JWT callback for token storage
- Session callback for user data

Closes M1.2"
```

### 3. Push в GitHub

```bash
git push
```

**ВАЖНО:** Если push не прошёл — **не продолжайте работу** над следующей подзадачей! Сначала решите проблему с push.

### 4. Обновление трекинга

После успешного push отметьте подзадачу в `TASKS-TRACKING.md`:

```markdown
- [x] 🟢 **M0.4** Переключатели языка
  - [x] `components/LanguageSwitcher.tsx` для публички
  - [x] `components/admin/AdminLanguageSwitcher.tsx`
  - [x] `lib/i18n/lang.ts` с утилитами языков
```

Закоммитьте и запушьте обновление документации:

```bash
git add docs/plan/TASKS-TRACKING.md
git commit -m "docs: mark M0.4 as completed"
git push
```

---

## 🏷️ Теги для milestone'ов

После **полного завершения** milestone (все подзадачи) создавайте тег:

```bash
# Пример после завершения всего M0
git tag -a v0.1.0 -m "Milestone M0: Project Bootstrap - Complete

All tasks completed:
- M0.1: Project initialization ✅
- M0.2: Directory structure and routing ✅
- M0.3: Basic layouts and providers ✅
- M0.4: Language switchers ✅
- M0.5: NextAuth stub ✅
- M0.6: Base HTTP client ✅
- M0.7: Code quality setup ✅

All acceptance criteria met."

git push origin v0.1.0
```

**Схема тегов:**
- `v0.1.0` — M0 (Bootstrap)
- `v0.2.0` — M1 (Auth & Roles)
- `v0.3.0` — M2 (Data & Types)
- `v0.4.0` — M3 (Admin MVP)
- `v0.5.0` — M4 (Content Seeding)
- `v0.6.0` — M5 (Public Site MVP)
- `v0.7.0` — M6 (Reader & Player)
- `v0.8.0` — M7 (SEO & Indexing)
- `v0.9.0` — M8 (Performance & UX)
- `v0.10.0` — M9 (Tests & Quality)
- `v1.0.0` — M10 (CI/CD & Deploy) 🎉

---

## 🚫 Что НЕ делать

❌ **НЕ** накапливать изменения нескольких подзадач в одном коммите  
❌ **НЕ** начинать следующую подзадачу без push текущей  
❌ **НЕ** коммитить код, который не проходит `typecheck` или `lint`  
❌ **НЕ** использовать неинформативные сообщения коммитов ("fix", "update", "wip")  
❌ **НЕ** пушить в main код, который не работает или ломает сборку

---

## ✅ Чеклист перед push

Перед каждым push проверьте:

- [ ] `yarn typecheck` — зелёный ✅
- [ ] `yarn lint` — зелёный ✅
- [ ] Код работает локально (протестировали в браузере)
- [ ] Коммит-сообщение информативное и следует формату
- [ ] Указан номер подзадачи (например, "Closes M0.4")
- [ ] Обновлён `TASKS-TRACKING.md` (если это финальный коммит подзадачи)

---

## 🔄 Работа с ветками (опционально, для сложных задач)

Для больших подзадач можно использовать feature-ветки:

```bash
# Создать ветку для подзадачи
git checkout -b feature/m0-4-language-switchers

# Работать, коммитить
git add .
git commit -m "feat: add LanguageSwitcher component"

# Когда готово — слить в main
git checkout main
git merge feature/m0-4-language-switchers
git push

# Удалить feature-ветку
git branch -d feature/m0-4-language-switchers
```

**Но для простых подзадач достаточно работать прямо в main.**

---

## 📊 Пример последовательности для M0

```bash
# M0.1-M0.3 уже готовы ✅

# M0.4: Переключатели языка
git add .
git commit -m "feat: add language switchers (M0.4)"
git push

git add docs/plan/TASKS-TRACKING.md
git commit -m "docs: mark M0.4 as completed"
git push

# M0.5: NextAuth заготовка
git add .
git commit -m "feat: add NextAuth stub configuration (M0.5)"
git push

git add docs/plan/TASKS-TRACKING.md
git commit -m "docs: mark M0.5 as completed"
git push

# M0.6: Базовый fetcher
git add .
git commit -m "feat: add base HTTP client (M0.6)"
git push

git add docs/plan/TASKS-TRACKING.md
git commit -m "docs: mark M0.6 as completed"
git push

# M0 полностью готов — создаём тег
git tag -a v0.1.0 -m "Milestone M0: Complete"
git push origin v0.1.0
```

---

## 🎯 Финальные рекомендации

1. **Частые коммиты** — лучше сделать 3 маленьких коммита, чем 1 огромный
2. **Информативные сообщения** — через месяц вы должны понять, что было сделано
3. **Пуш после каждой подзадачи** — это бэкап вашей работы в облаке
4. **Теги для milestone'ов** — это важные вехи проекта
5. **Не ломать main** — код в main всегда должен собираться и работать

---

**Следуя этому процессу, вы получите:**
- 📦 Чистую историю коммитов
- 🔄 Регулярные бэкапы в облаке
- 📊 Понятный прогресс работы
- 🐛 Легкость отката при необходимости
- 🤝 Готовность к командной работе
