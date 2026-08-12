'use strict';
/**
 * Общие утилиты для хуков Claude Code. Node без внешних зависимостей.
 *
 * Контракт хука: JSON на stdin, ответ через код выхода.
 *   deny(reason)     - запретить действие (только PreToolUse): stdout + exit 0
 *   complain(text)   - заставить агента отработать замечания: stderr + exit 2
 *   pass()           - пропустить: exit 0 без вывода
 *
 * Все проверки кода работают ТОЛЬКО по добавленным строкам относительно базовой ветки.
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

// ---------------------------------------------------------------- ввод и вывод

function readStdin() {
  return new Promise((resolve) => {
    let buf = '';
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try {
        resolve(buf.trim() ? JSON.parse(buf) : {});
      } catch (_) {
        resolve({});
      }
    };
    // если stdin не придёт - не висим вечно
    const timer = setTimeout(finish, 5000);
    timer.unref && timer.unref();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => {
      buf += c;
    });
    process.stdin.on('end', () => {
      clearTimeout(timer);
      finish();
    });
    process.stdin.on('error', () => {
      clearTimeout(timer);
      finish();
    });
  });
}

function deny(reason, eventName) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: eventName || 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: String(reason),
      },
    })
  );
  process.exit(0);
}

function complain(text) {
  process.stderr.write(String(text));
  process.exit(2);
}

function pass() {
  process.exit(0);
}

/** Хук никогда не должен ронять сессию своей ошибкой. */
function guard(fn) {
  Promise.resolve()
    .then(fn)
    .then(() => pass())
    .catch((e) => {
      if (process.env.CLAUDE_HOOK_DEBUG)
        process.stderr.write('hook error: ' + (e && e.stack) + '\n');
      process.exit(0);
    });
}

// ------------------------------------------------------------------ git и пути

function sh(cmd, args, cwd) {
  try {
    const r = cp.spawnSync(cmd, args, {
      cwd,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      windowsHide: true,
    });
    return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
  } catch (_) {
    return { ok: false, out: '', err: '' };
  }
}

function repoRoot(input) {
  const start = (input && input.cwd) || process.cwd();
  const r = sh('git', ['rev-parse', '--show-toplevel'], start);
  if (r.ok && r.out) return path.resolve(r.out);
  return path.resolve(start);
}

/** Путь относительно корня репозитория, всегда через прямые слэши. */
function rel(root, p) {
  if (!p) return '';
  const abs = path.isAbsolute(p) ? p : path.resolve(root, p);
  return path.relative(root, abs).split(path.sep).join('/');
}

/** Все файлы, которых касается текущий вызов инструмента. */
function targetFiles(input) {
  const ti = (input && input.tool_input) || {};
  const out = [];
  const push = (v) => {
    if (typeof v === 'string' && v.trim()) out.push(v);
  };
  push(ti.file_path);
  push(ti.notebook_path);
  push(ti.path);
  if (Array.isArray(ti.edits)) ti.edits.forEach((e) => e && push(e.file_path));
  if (Array.isArray(ti.files))
    ti.files.forEach((e) => push(typeof e === 'string' ? e : e && e.file_path));
  return Array.from(new Set(out));
}

// ------------------------------------------------------------------- шаблоны

/** glob -> RegExp. Поддержаны ** / * / ? и списки {a,b}. */
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

const _reCache = new Map();
function matchGlob(glob, relPath) {
  let re = _reCache.get(glob);
  if (!re) {
    re = globToRe(glob);
    _reCache.set(glob, re);
  }
  return re.test(relPath);
}

function matchAny(globs, relPath) {
  return (globs || []).some((g) => matchGlob(g, relPath));
}

// -------------------------------------------------------------------- правила

function loadRules(root) {
  const p = path.join(root, '.claude', 'hooks', 'rules.json');
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    return {};
  }
}

// ------------------------------------------------------- дифф и добавленные строки

/**
 * Точка отсчёта. Сначала merge-base с базовой веткой; если её нет или она совпала
 * с HEAD (работаем прямо в базовой ветке) - берём HEAD, то есть незакоммиченные правки.
 */
function baseRef(root, rules) {
  const base = (rules && rules.baseBranch) || 'main';
  const head = sh('git', ['rev-parse', 'HEAD'], root);
  for (const ref of [base, 'origin/' + base]) {
    const mb = sh('git', ['merge-base', 'HEAD', ref], root);
    if (mb.ok && mb.out && !(head.ok && mb.out === head.out)) return mb.out;
  }
  return 'HEAD';
}

/** Файлы текущего диффа: изменённые относительно базы плюс новые неотслеживаемые. */
function changedFiles(root, rules) {
  const base = baseRef(root, rules);
  const set = new Set();
  const d = sh('git', ['diff', '--name-only', base], root);
  if (d.ok)
    d.out
      .split('\n')
      .filter(Boolean)
      .forEach((f) => set.add(f));
  const u = sh('git', ['ls-files', '--others', '--exclude-standard'], root);
  if (u.ok)
    u.out
      .split('\n')
      .filter(Boolean)
      .forEach((f) => set.add(f));
  return Array.from(set);
}

/**
 * Только ДОБАВЛЕННЫЕ строки файла относительно базы: [{ line, text }].
 * Новый файл целиком считается добавленным.
 */
function addedLines(root, rules, relPath) {
  const base = baseRef(root, rules);
  const tracked = sh('git', ['ls-files', '--error-unmatch', relPath], root).ok;
  if (!tracked) {
    try {
      const txt = fs.readFileSync(path.join(root, relPath), 'utf8');
      return txt.split(/\r?\n/).map((text, i) => ({ line: i + 1, text }));
    } catch (_) {
      return [];
    }
  }
  const d = sh('git', ['diff', '--unified=0', '--no-color', base, '--', relPath], root);
  if (!d.ok || !d.out) return [];
  const out = [];
  let cur = 0;
  for (const line of d.out.split('\n')) {
    const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (m) {
      cur = parseInt(m[1], 10);
      continue;
    }
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('+')) {
      out.push({ line: cur, text: line.slice(1) });
      cur++;
    }
  }
  return out;
}

/** Добавленные строки всего диффа: { relPath: [{line,text}] } с фильтром по расширениям. */
function addedLinesAll(root, rules, exts) {
  const res = {};
  for (const f of changedFiles(root, rules)) {
    if (exts && exts.length && !exts.some((e) => f.endsWith(e))) continue;
    const lines = addedLines(root, rules, f);
    if (lines.length) res[f] = lines;
  }
  return res;
}

// ------------------------------------------------------------------- разрешения

/** Разовые разрешения: пути строками в .claude/unlock.txt (# - комментарий). */
function unlockList(root) {
  try {
    return fs
      .readFileSync(path.join(root, '.claude', 'unlock.txt'), 'utf8')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('#'));
  } catch (_) {
    return [];
  }
}

function isUnlocked(root, relPath) {
  return unlockList(root).some((g) => g === relPath || matchGlob(g, relPath));
}

// ------------------------------------------------------------------ состояние

function statePath(root) {
  return path.join(root, '.claude', '.qa-state');
}

function readState(root) {
  try {
    return JSON.parse(fs.readFileSync(statePath(root), 'utf8'));
  } catch (_) {
    return { edits: 0, lastQa: null };
  }
}

function writeState(root, obj) {
  try {
    fs.mkdirSync(path.dirname(statePath(root)), { recursive: true });
    fs.writeFileSync(statePath(root), JSON.stringify(obj, null, 2));
  } catch (_) {
    /* состояние - не повод падать */
  }
}

function bumpEdits(root, n) {
  const s = readState(root);
  s.edits = (s.edits || 0) + (n || 1);
  writeState(root, s);
  return s.edits;
}

// ------------------------------------------------------------------ транскрипт

/** Текст последнего сообщения ассистента из transcript_path (jsonl). */
function lastAssistantText(transcriptPath) {
  if (!transcriptPath) return '';
  let raw;
  try {
    raw = fs.readFileSync(transcriptPath, 'utf8');
  } catch (_) {
    return '';
  }
  const lines = raw.split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    let rec;
    try {
      rec = JSON.parse(lines[i]);
    } catch (_) {
      continue;
    }
    const msg = rec && (rec.message || rec);
    const role = (msg && msg.role) || rec.type;
    if (role !== 'assistant') continue;
    const content = msg && msg.content;
    if (!Array.isArray(content)) continue;
    const text = content
      .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('\n')
      .trim();
    if (text) return text;
  }
  return '';
}

/** Сколько ходов пользователя было в сессии. */
function userTurnCount(transcriptPath) {
  if (!transcriptPath) return 0;
  try {
    return fs
      .readFileSync(transcriptPath, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((l) => {
        try {
          const r = JSON.parse(l);
          const m = r.message || r;
          return (m.role || r.type) === 'user';
        } catch (_) {
          return false;
        }
      }).length;
  } catch (_) {
    return 0;
  }
}

/** Объём прозы: без блоков кода, таблиц, списков-ссылок и служебных строк. */
function proseLength(text) {
  if (!text) return 0;
  const noFence = String(text)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '');
  const kept = noFence
    .split(/\r?\n/)
    .filter((l) => !/^\s*\|/.test(l))
    .filter((l) => !/^\s*[-=]{3,}\s*$/.test(l))
    .join('\n');
  return kept.replace(/\s+/g, ' ').trim().length;
}

module.exports = {
  readStdin,
  deny,
  complain,
  pass,
  guard,
  sh,
  repoRoot,
  rel,
  targetFiles,
  matchGlob,
  matchAny,
  loadRules,
  baseRef,
  changedFiles,
  addedLines,
  addedLinesAll,
  unlockList,
  isUnlocked,
  readState,
  writeState,
  bumpEdits,
  statePath,
  lastAssistantText,
  userTurnCount,
  proseLength,
};
