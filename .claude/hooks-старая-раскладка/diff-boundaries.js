#!/usr/bin/env node
'use strict';
/**
 * diff-boundaries.js - Stop.
 *
 * Смотрит на дифф целиком, когда агент считает работу законченной, и не даёт сдать:
 *   - файлы под rules.protected            - трогать их нельзя вообще;
 *   - файлы под rules.diffBoundaries.forbidden - дампы, временные файлы, рабочие
 *     заметки, логи, отчёты сборки: в репозиторий они не едут;
 *   - незакрытые парные правки rules.crossChecks: изменил одно - обязан изменить второе
 *     (при requireNew - именно завести новый файл, например каталог миграции).
 *
 * Разовое исключение для первых двух пунктов - строка с путём в .claude/unlock.txt,
 * ровно как в protect-files.js: иначе агент упрётся в замечание, которое нечем снять.
 */

const L = require('./lib.js');

/** Первый шаблон из списка, под который подходит путь. */
function firstMatch(globs, relPath) {
  return (globs || []).find((g) => L.matchGlob(g, relPath)) || null;
}

/** Файлы, которых в базовой точке не было: неотслеживаемые плюс добавленные в диффе. */
function newFiles(root, rules) {
  const set = new Set();
  const u = L.sh('git', ['ls-files', '--others', '--exclude-standard'], root);
  if (u.ok)
    u.out
      .split('\n')
      .filter(Boolean)
      .forEach((f) => set.add(f));
  const a = L.sh('git', ['diff', '--name-only', '--diff-filter=A', L.baseRef(root, rules)], root);
  if (a.ok)
    a.out
      .split('\n')
      .filter(Boolean)
      .forEach((f) => set.add(f));
  return set;
}

L.guard(async () => {
  const input = await L.readStdin();
  // защита от зацикливания: замечание уже выдано, второй заход молчит
  if (input && input.stop_hook_active === true) return;

  const root = L.repoRoot(input);
  if (!L.sh('git', ['rev-parse', '--git-dir'], root).ok) return;

  const rules = L.loadRules(root);
  const protectedGlobs = rules.protected || [];
  const forbidden = (rules.diffBoundaries && rules.diffBoundaries.forbidden) || [];
  const crossChecks = rules.crossChecks || [];
  if (!protectedGlobs.length && !forbidden.length && !crossChecks.length) return;

  const notes = rules.protectedNote || {};
  const changed = L.changedFiles(root, rules);
  if (!changed.length) return;

  const problems = [];

  // 1. лишнее в диффе
  for (const r of changed) {
    if (L.isUnlocked(root, r)) continue;

    const hit = firstMatch(protectedGlobs, r);
    if (hit) {
      problems.push(
        '  ' +
          r +
          '\n' +
          '    файл под защитой, шаблон ' +
          hit +
          (notes[hit] ? '\n    почему: ' + notes[hit] : '') +
          '\n' +
          '    верни его к исходному виду: git checkout -- ' +
          r
      );
      continue;
    }

    const bad = firstMatch(forbidden, r);
    if (bad) {
      problems.push(
        '  ' +
          r +
          '\n' +
          '    такому файлу в диффе не место, шаблон ' +
          bad +
          (notes[bad] ? '\n    почему: ' + notes[bad] : '') +
          '\n' +
          '    убери его из диффа: удали файл или впиши его в .gitignore'
      );
    }
  }

  // 2. парные правки
  const created = newFiles(root, rules);
  for (const c of crossChecks) {
    if (!c || !c.ifChanged || !c.requireChanged) continue;
    const trigger = changed.filter((f) => L.matchGlob(c.ifChanged, f));
    if (!trigger.length) continue;

    const found = changed.filter(
      (f) => L.matchGlob(c.requireChanged, f) && (!c.requireNew || created.has(f))
    );
    if (found.length) continue;

    problems.push(
      '  ' +
        trigger.slice(0, 3).join(', ') +
        (trigger.length > 3 ? ' и ещё ' + (trigger.length - 3) : '') +
        '\n' +
        '    правило ' +
        (c.id || 'парная правка') +
        ': изменено одно, а второго в диффе нет\n' +
        '    не хватает: ' +
        (c.requireNew ? 'нового файла по шаблону ' : 'изменений в ') +
        c.requireChanged +
        (c.message ? '\n    ' + c.message : '')
    );
  }

  if (!problems.length) return;

  L.complain(
    'Дифф вышел за границы, работу так сдавать нельзя.\n\n' +
      problems.join('\n\n') +
      '\n\n' +
      'Разбери каждый пункт: лишнее убери из диффа, недостающее добавь. Потом заканчивай.\n' +
      'Если что-то из этого нужно по делу - объясни человеку и дождись ответа.'
  );
});
