#!/usr/bin/env node
'use strict';
/**
 * PostToolUse на Write|Edit|MultiEdit.
 *
 * Сразу после записи файла берёт ТОЛЬКО добавленные строки этого файла и гоняет по ним
 * правила rules.standards. Нашлись нарушения - замечания уходят агенту (stderr, код 2),
 * не нашлись - тихий выход. Счётчик правок растёт в любом случае.
 *
 * Никакого разбора синтаксиса: только регулярки по строкам и по содержимому файла с диска.
 */

const fs = require('fs');
const path = require('path');
const L = require('./lib.js');

const MAX_ISSUES = 10;
const DEFAULT_WINDOW = 3;

/** Битая регулярка в правилах не должна ронять хук - просто пропускаем такое правило. */
function makeRe(pattern, flags) {
  if (typeof pattern !== 'string' || !pattern) return null;
  try {
    return new RegExp(pattern, typeof flags === 'string' ? flags : '');
  } catch (_) {
    return null;
  }
}

/** test с глобальным флагом помнит позицию - сбрасываем перед каждой проверкой. */
function hits(re, text) {
  if (!re) return false;
  re.lastIndex = 0;
  try {
    return re.test(String(text == null ? '' : text));
  } catch (_) {
    return false;
  }
}

function readLines(root, relPath) {
  try {
    return fs.readFileSync(path.join(root, relPath), 'utf8').split(/\r?\n/);
  } catch (_) {
    return null;
  }
}

/** Готовим правило один раз: собранные регулярки или null, если правило непригодно. */
function prepare(st) {
  if (!st || typeof st !== 'object') return null;
  const kind = st.kind || 'line';
  if (kind !== 'line' && kind !== 'file' && kind !== 'near') return null;
  if (!Array.isArray(st.files) || !st.files.length) return null;

  const pattern = makeRe(st.pattern, st.flags);
  if (!pattern) return null;

  const absentInFile = kind === 'file' ? makeRe(st.absentInFile, st.flags) : null;
  if (kind === 'file' && !absentInFile) return null;

  const nearby = kind === 'near' ? makeRe(st.nearby, st.flags) : null;
  if (kind === 'near' && !nearby) return null;

  const win = Number(st.window);

  return {
    id: st.id || 'без номера',
    kind,
    files: st.files,
    pattern,
    skipIf: makeRe(st.skipIf, st.flags),
    absentInFile,
    nearby,
    window: Number.isFinite(win) && win >= 0 ? Math.floor(win) : DEFAULT_WINDOW,
    message: st.message || 'нарушение стандарта проекта',
  };
}

function checkFile(root, rules, relPath, prepared, issues) {
  const applicable = prepared.filter((st) => L.matchAny(st.files, relPath));
  if (!applicable.length) return;

  const added = L.addedLines(root, rules, relPath);
  if (!added.length) return;

  let fileLines; // читаем файл с диска лениво: нужен только для kind=file и kind=near
  const getFileLines = () => {
    if (fileLines === undefined) fileLines = readLines(root, relPath);
    return fileLines;
  };

  for (const st of applicable) {
    for (const a of added) {
      if (!hits(st.pattern, a.text)) continue;
      if (st.skipIf && hits(st.skipIf, a.text)) continue;

      let bad = true;

      if (st.kind === 'file') {
        const all = getFileLines();
        if (!all) continue; // файла нет на диске - молчим
        bad = !all.some((l) => hits(st.absentInFile, l));
      } else if (st.kind === 'near') {
        const all = getFileLines();
        if (!all) continue;
        const idx = a.line - 1;
        const from = Math.max(0, idx - st.window);
        const to = Math.min(all.length - 1, idx + st.window);
        bad = true;
        for (let i = from; i <= to; i++) {
          if (hits(st.nearby, all[i])) {
            bad = false;
            break;
          }
        }
      }

      if (bad) issues.push({ path: relPath, line: a.line, id: st.id, message: st.message });
    }
  }
}

function dedupe(issues) {
  const seen = new Set();
  const out = [];
  for (const it of issues) {
    const key = it.path + ':' + it.line + ':' + it.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

function render(issues) {
  const shown = issues.slice(0, MAX_ISSUES);
  const lines = ['Нарушения стандартов проекта в только что записанных файлах:'];
  for (const it of shown) {
    lines.push(it.path + ':' + it.line + '  [' + it.id + '] ' + it.message);
  }
  const rest = issues.length - shown.length;
  if (rest > 0) lines.push('и ещё ' + rest + ' ' + wordIssues(rest));
  lines.push('Исправьте перечисленное и перепишите файл, а не объясняйте, почему так можно.');
  return lines.join('\n') + '\n';
}

function wordIssues(n) {
  const t = n % 100;
  const o = n % 10;
  if (t >= 11 && t <= 14) return 'замечаний';
  if (o === 1) return 'замечание';
  if (o >= 2 && o <= 4) return 'замечания';
  return 'замечаний';
}

L.guard(async () => {
  const input = await L.readStdin();
  const root = L.repoRoot(input);

  // счётчик правок растёт всегда, даже когда замечаний нет
  L.bumpEdits(root, 1);

  const rules = L.loadRules(root);
  const prepared = (Array.isArray(rules.standards) ? rules.standards : [])
    .map(prepare)
    .filter(Boolean);
  if (!prepared.length) return;

  const issues = [];
  for (const abs of L.targetFiles(input)) {
    const relPath = L.rel(root, abs);
    if (!relPath || relPath.startsWith('..')) continue; // файл вне репозитория
    checkFile(root, rules, relPath, prepared, issues);
  }

  const found = dedupe(issues).sort((a, b) =>
    a.path === b.path ? a.line - b.line : a.path < b.path ? -1 : 1
  );
  if (found.length) L.complain(render(found));
});
