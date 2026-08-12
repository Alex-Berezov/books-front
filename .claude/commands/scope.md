---
description: Режим удержания правок в границах задачи - strict, off, show
argument-hint: strict | off | show
allowed-tools: Bash, Read
---

# /scope - границы задачи

Аргумент: $ARGUMENTS

Зона задачи - файлы текущего диффа против `main` плюс папки этих файлов. Сосед по папке считается
своим, файл из другой части репозитория - выходом за зону. Следит за этим хук `scope.js`.

Режимы:

- `strict` - любой выход за зону запрещается сразу;
- `off` - хук молчит, границы не удерживаются;
- пусто или файла нет - мягкий режим: уходы копятся в `.claude/.qa-state`, поле `strayFiles`,
  и запрет включается, когда их станет больше `scope.softLimit` из `rules.json`.

## strict

```
node -e "require('fs').writeFileSync('.claude/scope.txt','strict\n')"
```

Ответ: одна строка «Режим strict: правки только в файлах диффа и их папках».

## off

```
node -e "require('fs').writeFileSync('.claude/scope.txt','off\n')"
```

Ответ: одна строка «Режим off: границы не удерживаются». Добавь вторую строку - напоминание
вернуть `strict` или мягкий режим после того, как расползание закончится.

## show

Ничего не пишет, только показывает.

```
node -e "try{process.stdout.write(require('fs').readFileSync('.claude/scope.txt','utf8').split(/\r?\n/)[0].trim()||'(пусто)')}catch(e){process.stdout.write('(файла нет)')}"
git diff --merge-base main --name-only
git ls-files --others --exclude-standard
node -e "let s={};try{s=JSON.parse(require('fs').readFileSync('.claude/.qa-state','utf8'))}catch(e){}console.log(JSON.stringify(s.strayFiles||[],null,1))"
```

Выведи три части:

1. **Режим** - `strict`, `off` или `мягкий` (когда в файле пусто или файла нет).
2. **Зона** - файлы диффа и, отдельным списком, их папки. Больше двадцати файлов - покажи папки
   и число файлов, перечислять всё не надо.
3. **Выходы за зону** - накопленные `strayFiles`. Список пуст - так и напиши одной строкой.

Список выходов не пуст и разросся - скажи человеку, какие из них к задаче отношения не имеют.
Очищается поле в шаге 6 команды `/qa`; руками правь `.qa-state` только тогда, когда человек прямо
сказал, что все эти файлы и есть задача.

## Без аргумента

Считай, что попросили `show`.
