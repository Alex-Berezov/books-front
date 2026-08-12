#!/usr/bin/env node
'use strict';
/**
 * answer-length.js - Stop. Третий уровень контроля формата: объём ответа.
 *
 * Берёт последнее сообщение ассистента, меряет в нём прозу (код, команды и таблицы
 * не считаются) и, если вышло больше rules.answerFormat.maxProse, возвращает агенту
 * замечание с требованием переписать ответ короче и по формату.
 *
 * Ничего не проверяет по коду и никогда не запрещает действий: только объём текста.
 */

const L = require('./lib.js');

const DEFAULT_MAX = 2200;

function render(len, max) {
  const over = len - max;
  return (
    'Ответ слишком длинный: ' +
    len +
    ' знаков прозы при пороге ' +
    max +
    ', перебор ' +
    over +
    '.\n' +
    'Перепиши тот же ответ короче, ничего не теряя по смыслу, и держи формат:\n' +
    '1) что сделано по сути - до трёх строк;\n' +
    '2) Проверки: команда - результат, по строке на каждую команду;\n' +
    '3) что осталось или что может сломаться - только если это правда есть,\n' +
    '   иначе третий блок просто опусти.\n' +
    'Код, команды и таблицы в объём не входят - режь рассуждения, пересказ хода\n' +
    'работы и вводные обороты.\n'
  );
}

L.guard(async () => {
  const input = await L.readStdin();

  // повторный заход после нашего же замечания - молчим, иначе получится петля
  if (input && input.stop_hook_active === true) return;

  const text = L.lastAssistantText(input && input.transcript_path);
  if (!text) return; // транскрипта нет или последний ответ пуст

  const root = L.repoRoot(input);
  const rules = L.loadRules(root);
  const fmt = (rules && rules.answerFormat) || {};
  const raw = Number(fmt.maxProse);
  const max = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_MAX;

  const len = L.proseLength(text);
  if (len > max) L.complain(render(len, max));
});
