#!/usr/bin/env node
'use strict';
/**
 * qa-lock.js - Stop. Замок отдела контроля качества.
 *
 * Считает, сколько правок накопилось со времени последнего прогона /qa
 * (счётчик edits в .claude/.qa-state растит хук на запись файлов).
 * Перевалило за порог rules.qaLock.threshold - работу не закрываем, пока не прошёл /qa.
 *
 * Счётчик обнуляет сама команда /qa. Хук его не трогает: иначе замок открывался бы
 * от одного лишь факта остановки.
 */

const L = require('./lib.js');

L.guard(async () => {
  const input = await L.readStdin();
  // защита от зацикливания: замечание уже выдано, второй заход молчит
  if (input && input.stop_hook_active === true) return;

  const root = L.repoRoot(input);
  const rules = L.loadRules(root);

  const threshold =
    rules.qaLock && typeof rules.qaLock.threshold === 'number' ? rules.qaLock.threshold : 10;

  const state = L.readState(root);
  const edits = typeof state.edits === 'number' ? state.edits : 0;
  if (edits <= threshold) return;

  const since = state.lastQa ? 'Последний прогон: ' + state.lastQa + '.\n' : '';

  L.complain(
    'Накопилось ' +
      edits +
      ' изменений без прогона /qa, запусти его.\n' +
      'Порог - ' +
      threshold +
      '.\n' +
      since +
      'Пройдёт /qa - счётчик обнулится сам, и работу можно будет закрыть.\n' +
      'Замечания /qa разбери до конца, а не откладывай на потом.'
  );
});
