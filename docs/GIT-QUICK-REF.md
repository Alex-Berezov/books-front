# Git Quick Reference (Быстрая памятка)

## 🚀 После каждой подзадачи

```bash
# 1. Проверка
yarn typecheck && yarn lint

# 2. Коммит
git add .
git commit -m "feat: краткое описание (M0.4)

- Детали изменения 1
- Детали изменения 2

Closes M0.4"

# 3. Push (ОБЯЗАТЕЛЬНО!)
git push

# 4. Обновить трекинг
# Отметить подзадачу в docs/plan/TASKS-TRACKING.md как 🟢

git add docs/plan/TASKS-TRACKING.md
git commit -m "docs: mark M0.4 as completed"
git push
```

## 📋 Типы коммитов

- `feat:` — новая функциональность
- `fix:` — исправление бага
- `docs:` — документация
- `style:` — форматирование
- `refactor:` — рефакторинг
- `test:` — тесты
- `chore:` — конфигурация

## 🏷️ Теги (после завершения milestone)

```bash
git tag -a v0.1.0 -m "Milestone M0: Complete"
git push origin v0.1.0
```

## ⚠️ ВАЖНО

**НЕ НАЧИНАТЬ СЛЕДУЮЩУЮ ПОДЗАДАЧУ БЕЗ PUSH ТЕКУЩЕЙ!**

Полная документация: [docs/GIT-WORKFLOW.md](./GIT-WORKFLOW.md)
