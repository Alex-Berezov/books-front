#!/usr/bin/env node
'use strict';
/**
 * protect-files.js - PreToolUse на Write|Edit|MultiEdit.
 *
 * Не даёт писать в файлы, которые ломать нельзя:
 *   rules.protected   - запрет на запись совсем;
 *   rules.createOnly  - создать новый файл можно, править существующий нельзя
 *                       (новая миграция - да, применённая - нет).
 * Разовое исключение: строка с путём в .claude/unlock.txt.
 */

const fs = require('fs');
const path = require('path');
const L = require('./lib.js');

/** Первый шаблон из списка, под который подходит путь. */
function firstMatch(globs, relPath) {
  return (globs || []).find((g) => L.matchGlob(g, relPath)) || null;
}

function unlockHint(relPath) {
  return (
    'Если правка действительно нужна - впиши строку\n' +
    '  ' +
    relPath +
    '\n' +
    'в файл .claude/unlock.txt и повтори действие. Разрешение разовое, после работы строку убери.'
  );
}

L.guard(async () => {
  const input = await L.readStdin();
  const root = L.repoRoot(input);

  // нет git - молчим
  if (!L.sh('git', ['rev-parse', '--git-dir'], root).ok) return;

  const rules = L.loadRules(root);
  const protectedGlobs = rules.protected || [];
  const createOnly = rules.createOnly || [];
  if (!protectedGlobs.length && !createOnly.length) return;

  const notes = rules.protectedNote || {};

  for (const file of L.targetFiles(input)) {
    const r = L.rel(root, file);
    // файл вне репозитория - не наше дело
    if (!r || r.startsWith('..')) continue;
    if (L.isUnlocked(root, r)) continue;

    const hit = firstMatch(protectedGlobs, r);
    if (hit) {
      const why = notes[hit] ? '\nПочему: ' + notes[hit] : '';
      L.deny(
        'Файл под защитой: ' + r + '\n' + 'Сработал шаблон: ' + hit + why + '\n\n' + unlockHint(r)
      );
    }

    const only = firstMatch(createOnly, r);
    if (only) {
      let exists = false;
      try {
        exists = fs.statSync(path.resolve(root, r)).isFile();
      } catch (_) {
        exists = false;
      }
      if (exists) {
        const why = notes[only] ? '\nПочему: ' + notes[only] : '';
        L.deny(
          'Этот файл можно только создавать, править существующий нельзя: ' +
            r +
            '\n' +
            'Сработал шаблон: ' +
            only +
            why +
            '\n' +
            'Нужно изменение - заведи новый файл рядом, а не переписывай этот.\n\n' +
            unlockHint(r)
        );
      }
    }
  }
});
