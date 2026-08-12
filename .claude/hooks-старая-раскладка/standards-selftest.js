#!/usr/bin/env node
'use strict';
/**
 * Проверка правил rules.standards на живом файле - без запуска Claude и без хуков.
 * Все строки файла считаются добавленными, так что заведомо плохой код должен
 * дать полный список нарушений.
 *
 *   node standards-selftest.js <rules.json> <файл> [путь-в-репозитории] [--all]
 *
 *   путь-в-репозитории - по какому пути сверять files-глобы правил
 *                        (по умолчанию берётся сам путь к файлу)
 *   --all              - гонять все правила, не глядя на files
 *
 * Код выхода: 1 если нашлись нарушения, иначе 0.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_WINDOW = 3;

// ------------------------------------------------------------------ глобы

function globToRe(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') {
          re += '(?:.*/)?';
          i += 2;
        } else {
          re += '.*';
          i += 1;
        }
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') re += '[^/]';
    else if (c === '{') re += '(?:';
    else if (c === '}') re += ')';
    else if (c === ',') re += '|';
    else re += c.replace(/[.+^$()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + re + '$');
}

function matchAny(globs, relPath) {
  return (globs || []).some((g) => {
    try {
      return globToRe(g).test(relPath);
    } catch (_) {
      return false;
    }
  });
}

// ------------------------------------------------------------------ правила

function makeRe(pattern, flags) {
  if (typeof pattern !== 'string' || !pattern) return null;
  try {
    return new RegExp(pattern, typeof flags === 'string' ? flags : '');
  } catch (_) {
    return null;
  }
}

function hits(re, text) {
  if (!re) return false;
  re.lastIndex = 0;
  try {
    return re.test(String(text == null ? '' : text));
  } catch (_) {
    return false;
  }
}

/** Возвращает готовое правило или строку с причиной, почему оно пропущено. */
function prepare(st, index) {
  const id = (st && st.id) || 'правило №' + (index + 1);
  if (!st || typeof st !== 'object') return 'пропущено [' + id + ']: правило не объект';
  const kind = st.kind || 'line';
  if (kind !== 'line' && kind !== 'file' && kind !== 'near') {
    return 'пропущено [' + id + ']: неизвестный kind "' + kind + '"';
  }
  if (!Array.isArray(st.files) || !st.files.length) {
    return 'пропущено [' + id + ']: не заданы files';
  }
  const pattern = makeRe(st.pattern, st.flags);
  if (!pattern) return 'пропущено [' + id + ']: битая или пустая регулярка pattern';

  const absentInFile = kind === 'file' ? makeRe(st.absentInFile, st.flags) : null;
  if (kind === 'file' && !absentInFile) {
    return 'пропущено [' + id + ']: битая или пустая регулярка absentInFile';
  }
  const nearby = kind === 'near' ? makeRe(st.nearby, st.flags) : null;
  if (kind === 'near' && !nearby) {
    return 'пропущено [' + id + ']: битая или пустая регулярка nearby';
  }
  if (typeof st.skipIf === 'string' && st.skipIf && !makeRe(st.skipIf, st.flags)) {
    return 'пропущено [' + id + ']: битая регулярка skipIf';
  }

  const win = Number(st.window);
  return {
    id,
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

// ------------------------------------------------------------------ запуск

function main(argv) {
  const args = argv.filter((a) => a !== '--all');
  const all = argv.length !== args.length;

  if (args.length < 2) {
    console.error(
      'нужно: node standards-selftest.js <rules.json> <файл> [путь-в-репозитории] [--all]'
    );
    return 2;
  }

  const rulesPath = path.resolve(args[0]);
  const filePath = path.resolve(args[1]);
  const relPath = (args[2] || args[1]).split(path.sep).join('/').replace(/^\.\//, '');

  let rules;
  try {
    rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
  } catch (e) {
    console.error('не читается rules.json: ' + (e && e.message));
    return 2;
  }

  let lines;
  try {
    lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  } catch (e) {
    console.error('не читается файл: ' + (e && e.message));
    return 2;
  }

  const raw = Array.isArray(rules.standards) ? rules.standards : [];
  const prepared = [];
  const skipped = [];
  raw.forEach((st, i) => {
    const r = prepare(st, i);
    if (typeof r === 'string') skipped.push(r);
    else prepared.push(r);
  });

  const applicable = prepared.filter((st) => all || matchAny(st.files, relPath));
  const issues = [];

  for (const st of applicable) {
    lines.forEach((text, i) => {
      const lineNo = i + 1;
      if (!hits(st.pattern, text)) return;
      if (st.skipIf && hits(st.skipIf, text)) return;

      let bad = true;
      if (st.kind === 'file') {
        bad = !lines.some((l) => hits(st.absentInFile, l));
      } else if (st.kind === 'near') {
        const from = Math.max(0, i - st.window);
        const to = Math.min(lines.length - 1, i + st.window);
        bad = true;
        for (let j = from; j <= to; j++) {
          if (hits(st.nearby, lines[j])) {
            bad = false;
            break;
          }
        }
      }
      if (bad) issues.push({ line: lineNo, id: st.id, message: st.message });
    });
  }

  issues.sort((a, b) => a.line - b.line);

  console.log('файл: ' + relPath);
  console.log(
    'правил в rules.json: ' +
      raw.length +
      ', пригодных: ' +
      prepared.length +
      ', применено к этому файлу: ' +
      applicable.length
  );
  skipped.forEach((s) => console.log(s));
  if (!applicable.length) {
    console.log('ни одно правило не подходит по files - проверьте путь или добавьте --all');
  }
  console.log('');

  for (const it of issues) {
    console.log(relPath + ':' + it.line + '  [' + it.id + '] ' + it.message);
  }
  console.log('');
  console.log('нарушений: ' + issues.length);

  return issues.length ? 1 : 0;
}

process.exit(main(process.argv.slice(2)));
