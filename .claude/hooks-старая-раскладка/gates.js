#!/usr/bin/env node
'use strict';
/**
 * gates.js - прогон обязательных проверок. Это НЕ хук: запускается руками
 * и командой /gates, читает stdin только для аргументов командной строки.
 *
 * Смысл скрипта простой: нельзя написать "всё зелёное", не запустив проверки.
 * Вывод команд печатается настоящий, код возврата сохраняется честно.
 *
 * Использование:
 *   node .claude/hooks/gates.js              - выбрать и прогнать
 *   node .claude/hooks/gates.js --list       - только показать, что будет запущено
 *   node .claude/hooks/gates.js --only=typecheck,lint
 *   node .claude/hooks/gates.js --bail       - остановиться на первом падении
 *
 * Код выхода: 1, если упал хотя бы один гейт, иначе 0.
 */

const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const L = require('./lib.js');

// сколько строк вывода показываем целиком и как режем длинный
const FULL_LIMIT = 200;
const HEAD_LINES = 40;
const TAIL_LINES = 60;

// ------------------------------------------------------------------ аргументы

function parseArgs(argv) {
  const res = { list: false, bail: false, only: null, help: false };
  for (const a of argv) {
    if (a === '--list') res.list = true;
    else if (a === '--bail') res.bail = true;
    else if (a === '--help' || a === '-h') res.help = true;
    else if (a.startsWith('--only=')) {
      res.only = a
        .slice('--only='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return res;
}

function printHelp() {
  console.log(
    [
      'gates.js - прогон обязательных проверок репозитория.',
      '',
      '  --list            показать выбранные гейты и выйти, ничего не запуская',
      '  --only=a,b        запустить только гейты с этими id',
      '  --bail            остановиться сразу после первого падения',
      '',
      'Список гейтов берётся из .claude/hooks/rules.json, поле gates.',
      'Гейт с when="always" запускается всегда, с when="glob:<шаблон>" - только если',
      'под шаблон подходит хотя бы один изменённый файл.',
    ].join('\n')
  );
}

// ------------------------------------------------------------------ выбор гейтов

/** Разбор условия when: возвращает шаблон для glob:... или null для always. */
function whenGlob(when) {
  const w = String(when || 'always').trim();
  if (w.startsWith('glob:')) return w.slice('glob:'.length).trim();
  return null;
}

/**
 * Отбор гейтов. Для каждого - решение и причина человеческими словами.
 * Возвращает [{ gate, run, reason }] в исходном порядке.
 */
function selectGates(gates, changed, only) {
  return gates.map((gate) => {
    const glob = whenGlob(gate.when);
    if (only && only.length && only.indexOf(gate.id) === -1) {
      return { gate, run: false, reason: 'не выбран через --only' };
    }
    if (!glob) return { gate, run: true, reason: 'запускается всегда' };
    const hit = changed.find((f) => L.matchGlob(glob, f));
    if (hit) {
      return { gate, run: true, reason: 'включил файл ' + hit + ' (шаблон ' + glob + ')' };
    }
    return { gate, run: false, reason: 'нет изменённых файлов под шаблон ' + glob };
  });
}

// ------------------------------------------------------------------ вывод команды

function secs(ms) {
  const s = ms / 1000;
  return (s < 10 ? s.toFixed(1) : String(Math.round(s))) + 'с';
}

/** Длинный вывод режем посередине, но полностью кладём в файл и говорим куда. */
function printOutput(text, logPath) {
  const raw = String(text == null ? '' : text).replace(/\s+$/, '');
  if (!raw) {
    console.log('  (команда ничего не вывела)');
    return;
  }
  const lines = raw.split(/\r?\n/);
  if (lines.length <= FULL_LIMIT) {
    console.log(raw);
    return;
  }
  const cut = lines.length - HEAD_LINES - TAIL_LINES;
  console.log(lines.slice(0, HEAD_LINES).join('\n'));
  console.log('... срезано ' + cut + ' строк ...');
  console.log(lines.slice(lines.length - TAIL_LINES).join('\n'));
  if (logPath) console.log('Полный вывод: ' + logPath);
}

function saveLog(id, text) {
  try {
    const safe = String(id).replace(/[^a-zA-Z0-9._-]/g, '_');
    const p = path.join(os.tmpdir(), 'gates-' + safe + '-' + process.pid + '.log');
    fs.writeFileSync(p, text);
    return p;
  } catch (_) {
    return '';
  }
}

/** Запуск одной команды. stdin наследуем, вывод собираем целиком. */
function runGate(gate, root) {
  const started = Date.now();
  let r;
  try {
    r = cp.spawnSync(gate.cmd, {
      cwd: root,
      shell: true,
      encoding: 'utf8',
      stdio: ['inherit', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
    });
  } catch (e) {
    return {
      code: 1,
      ms: Date.now() - started,
      text: 'не удалось запустить команду: ' + (e && e.message),
    };
  }
  const parts = [];
  if (r.stdout) parts.push(r.stdout);
  if (r.stderr) parts.push(r.stderr);
  let text = parts.join('\n');
  let code;
  if (r.error) {
    text = (text ? text + '\n' : '') + 'не удалось запустить команду: ' + r.error.message;
    code = 1;
  } else if (r.status === null) {
    text = (text ? text + '\n' : '') + 'команда прервана сигналом ' + (r.signal || 'неизвестно');
    code = 1;
  } else {
    code = r.status;
  }
  return { code, ms: Date.now() - started, text };
}

// ---------------------------------------------------------------------- запуск

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return 0;
  }

  const root = L.repoRoot({});
  const rules = L.loadRules(root);
  const gates = Array.isArray(rules.gates) ? rules.gates.filter((g) => g && g.id && g.cmd) : [];

  console.log('Репозиторий: ' + (rules.repo || path.basename(root)) + ' (' + root + ')');

  if (!gates.length) {
    console.log('В .claude/hooks/rules.json нет ни одного гейта - проверять нечего.');
    return 0;
  }

  const changed = L.changedFiles(root, rules);
  console.log(
    'Изменённых файлов относительно ' + (rules.baseBranch || 'main') + ': ' + changed.length
  );
  if (!changed.length) {
    console.log('Условные гейты пропущены: диффа не видно (нет изменений или нет git).');
  }

  if (args.only && args.only.length) {
    const known = gates.map((g) => g.id);
    const unknown = args.only.filter((id) => known.indexOf(id) === -1);
    if (unknown.length) {
      console.log('Неизвестные id в --only: ' + unknown.join(', ') + '. Есть: ' + known.join(', '));
    }
  }

  const plan = selectGates(gates, changed, args.only);
  const toRun = plan.filter((p) => p.run);
  const skipped = plan.filter((p) => !p.run);

  console.log('');
  console.log('Будет запущено (' + toRun.length + '):');
  if (!toRun.length) console.log('  ничего');
  for (const p of toRun) {
    console.log(
      '  ' +
        p.gate.id +
        '  ' +
        p.gate.cmd +
        '  - ' +
        p.reason +
        (p.gate.note ? '. ' + p.gate.note : '')
    );
  }
  if (skipped.length) {
    console.log('Пропущено (' + skipped.length + '):');
    for (const p of skipped) console.log('  ' + p.gate.id + '  - ' + p.reason);
  }

  if (args.list) {
    console.log('');
    console.log('Это был --list, ничего не запускалось.');
    return 0;
  }
  if (!toRun.length) return 0;

  const results = [];
  let stopped = false;
  for (const p of toRun) {
    if (stopped) {
      results.push({ gate: p.gate, skippedAfterFail: true });
      continue;
    }
    console.log('');
    console.log('=== ' + p.gate.id + ': ' + p.gate.cmd + ' ===');
    const r = runGate(p.gate, root);
    const logPath = r.text.split(/\r?\n/).length > FULL_LIMIT ? saveLog(p.gate.id, r.text) : '';
    printOutput(r.text, logPath);
    console.log(
      '--- ' +
        p.gate.id +
        ': ' +
        (r.code === 0 ? 'ok' : 'ПАДАЕТ, код ' + r.code) +
        ', ' +
        secs(r.ms) +
        ' ---'
    );
    results.push({ gate: p.gate, code: r.code, ms: r.ms });
    if (r.code !== 0 && args.bail) stopped = true;
  }

  const failed = results.filter((r) => !r.skippedAfterFail && r.code !== 0);

  console.log('');
  console.log('Сводка:');
  const width = Math.max.apply(
    null,
    results.map((r) => r.gate.id.length)
  );
  const cmdWidth = Math.max.apply(
    null,
    results.map((r) => r.gate.cmd.length)
  );
  for (const r of results) {
    const id = r.gate.id + ' '.repeat(width - r.gate.id.length);
    const cmd = r.gate.cmd + ' '.repeat(cmdWidth - r.gate.cmd.length);
    const status = r.skippedAfterFail
      ? 'не запускался (остановились на первом падении)'
      : r.code === 0
        ? 'ok (' + secs(r.ms) + ')'
        : 'ПАДАЕТ (код ' + r.code + ', ' + secs(r.ms) + ')';
    console.log('  ' + id + '  ' + cmd + '  ' + status);
  }

  if (failed.length) {
    console.log('');
    console.log(
      'Упало гейтов: ' + failed.length + ' из ' + results.length + '. Чини и прогоняй заново.'
    );
    return 1;
  }
  console.log('');
  console.log('Все гейты прошли.');
  return 0;
}

let code = 1;
try {
  code = main();
} catch (e) {
  // скрипт-проверка не имеет права молча притвориться зелёным
  console.error('gates.js сломался: ' + (e && e.stack ? e.stack : e));
  code = 1;
}
process.exit(code);
