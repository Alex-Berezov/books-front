# Release policy (SemVer + Conventional Commits)

Цель: предсказуемые релизы, автогенерация changelog и тегов.

## Семантическое версионирование (SemVer)

- MAJOR: несовместимые изменения
- MINOR: новые фичи (back‑compatible)
- PATCH: багфиксы, мелкие правки

## Conventional Commits

Формат: `type(scope)?: subject`

Основные типы:

- feat: новая функциональность (MINOR)
- fix: исправление (PATCH)
- perf, refactor, docs, chore, test, ci, build, style: без повышения MINOR/MAJOR
- feat!: breaking change (MAJOR) — добавить `!` или `BREAKING CHANGE:` в body

Пример:

- `feat(auth): add refresh token retry`
- `fix(reader): handle empty chapters list`
- `feat!: drop legacy seo endpoint\n\nBREAKING CHANGE: ...`

## CHANGELOG

- Генерация из истории коммитов (conventional-changelog или Changesets).
- Правило: каждый релиз → раздел с типами изменений.

## Процесс релиза

1. Merge в main с корректными commit messages
2. Тегирование версии:
   - авто: по Conventional Commits (скрипт вычисляет next version)
   - ручное: `vX.Y.Z`
3. Публикация релиза (GitHub Release) с changelog
4. CD подхватывает тег и деплоит

## Инструменты

- conventional-recommended-bump — определение следующей версии
- conventional-changelog — генерация CHANGELOG.md
- (опция) Changesets — более гибкое управление пакетами и релизами

## Автоматизация (эскиз)

- GitHub Actions `release.yml` (workflow_dispatch):
  - checkout, setup node, yarn install
  - вычислить next version → обновить package.json → генерировать CHANGELOG
  - создать git тег и GitHub Release
  - запустить CD

## Правила PR

- Заголовок PR соответствует Conventional Commits (squash‑merge унаследует заголовок)
- В описании PR — список изменений и миграций (если есть)
