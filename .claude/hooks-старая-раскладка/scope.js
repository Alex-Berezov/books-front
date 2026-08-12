#!/usr/bin/env node
'use strict';
/**
 * scope.js - PreToolUse на Write|Edit|MultiEdit.
 *
 * Держит правки в рамках начатой задачи. Зона задачи - файлы текущего диффа
 * относительно базовой ветки плюс папки этих файлов: сосед в той же папке свой.
 *
 * Режим берётся из первой строки .claude/scope.txt:
 *   strict - любой выход за зону запрещён;
 *   off    - хук молчит;
 *   пусто или файла нет - мягкий режим: уходы копятся в .claude/.qa-state
 *   (поле strayFiles) и запрет включается, когда их станет больше scope.softLimit.
 */

const fs = require('fs');
const path = require('path');
const L = require('./lib.js');

function readMode(root) {
  try {
    const first = fs
      .readFileSync(path.join(root, '.claude', 'scope.txt'), 'utf8')
      .split(/\r?\n/)[0]
      .trim()
      .toLowerCase();
    if (first === 'strict' || first === 'off') return first;
    return 'soft';
  } catch (_) {
    return 'soft';
  }
}

function dirOf(relPath) {
  const i = relPath.lastIndexOf('/');
  return i === -1 ? '.' : relPath.slice(0, i);
}

/** Короткий список: не больше limit пунктов, остальное числом. */
function listSome(items, limit) {
  const arr = items.slice(0, limit).map((s) => '  ' + s);
  if (items.length > limit) arr.push('  и ещё ' + (items.length - limit));
  return arr.join('\n');
}

function zoneText(files, dirs) {
  return (
    'Зона текущей задачи - это файлы диффа относительно базовой ветки:\n' +
    listSome(files, 20) +
    '\nи любые файлы в их папках:\n' +
    listSome(
      dirs.map((d) => (d === '.' ? 'корень репозитория' : d + '/')),
      12
    )
  );
}

L.guard(async () => {
  const input = await L.readStdin();
  const root = L.repoRoot(input);

  if (!L.sh('git', ['rev-parse', '--git-dir'], root).ok) return;

  const rules = L.loadRules(root);
  const scope = rules.scope || {};
  if (!rules.repo && !scope.alwaysAllowed && scope.softLimit == null) return;

  const mode = readMode(root);
  if (mode === 'off') return;

  // служебные файлы самой обвязки в зону не входят и в счёт не идут
  const isHarness = (p) => p === '.claude' || p.startsWith('.claude/');

  const changed = L.changedFiles(root, rules).filter((f) => !isHarness(f));
  // дифф пуст - задача только началась, зоны ещё нет
  if (!changed.length) return;

  const zoneFiles = new Set(changed);
  const zoneDirs = new Set(changed.map(dirOf));
  const allowed = scope.alwaysAllowed || [];

  const stray = [];
  for (const file of L.targetFiles(input)) {
    const r = L.rel(root, file);
    if (!r || r.startsWith('..')) continue;
    if (isHarness(r)) continue;
    if (L.matchAny(allowed, r)) continue; // тесты, документация, миграции - всегда можно
    if (zoneFiles.has(r)) continue;
    if (zoneDirs.has(dirOf(r))) continue;
    stray.push(r);
  }
  if (!stray.length) return;

  const zone = zoneText(Array.from(zoneFiles).sort(), Array.from(zoneDirs).sort());

  if (mode === 'strict') {
    L.deny(
      'Строгий режим рамок: файл вне зоны задачи.\n' +
        'Просишь править:\n' +
        listSome(stray, 10) +
        '\n\n' +
        zone +
        '\n\nЕсли правка нужна по делу - опиши её человеку и заведи отдельную задачу,\n' +
        'либо сними строгий режим: первая строка .claude/scope.txt.'
    );
  }

  // мягкий режим: копим уходы в сторону
  const limit = typeof scope.softLimit === 'number' ? scope.softLimit : 12;
  const state = L.readState(root);
  const prev = Array.isArray(state.strayFiles) ? state.strayFiles : [];
  const all = Array.from(new Set(prev.concat(stray)));
  state.strayFiles = all;
  L.writeState(root, state);

  if (all.length > limit) {
    L.deny(
      'Задача расползлась: файлов вне зоны уже ' +
        all.length +
        ' при пороге ' +
        limit +
        '.\n' +
        'Остановись, ничего больше не правь и спроси человека, что делать дальше.\n\n' +
        'Файлы вне зоны:\n' +
        listSome(all, 30) +
        '\n\n' +
        zone +
        '\n\nЕсли всё это и есть задача - скажи об этом человеку и очисти поле strayFiles\n' +
        'в .claude/.qa-state только после его ответа.'
    );
  }
});
