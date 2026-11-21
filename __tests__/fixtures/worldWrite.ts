import type {
  LlmOperation,
  WorldWrite as WorldWriteRun,
  WorldWriteItem,
  WorldWriteStep,
} from '@/types/api-schema';

/** Типизированные заготовки хода «Write World» для тестов панели и подписей (без `as never`). */

export const operation = (patch: Partial<LlmOperation> = {}): LlmOperation => ({
  id: 'op-1',
  kind: 'draft',
  status: 'done',
  pauseReason: null,
  bookVersionId: 'v1',
  limitUsd: '2',
  reservedUsd: '0',
  spentUsd: '0.5',
  createdAt: '2026-11-17T00:00:00.000Z',
  updatedAt: '2026-11-17T00:00:00.000Z',
  ...patch,
});

export const item = (patch: Partial<WorldWriteItem> = {}): WorldWriteItem => ({
  index: 0,
  key: 'anna',
  block: 'short',
  step: 1,
  verdict: 'ok',
  remarks: [],
  review: { kind: 'answered', model: 'openai/gpt-6-luna' },
  outcome: 'proposed',
  failedReason: null,
  regenFailedReason: null,
  regenerating: false,
  regenOperationId: null,
  regenOperationStatus: null,
  regenPauseReason: null,
  ...patch,
});

export const step = (patch: Partial<WorldWriteStep> = {}): WorldWriteStep => ({
  step: 0,
  kind: 'select',
  key: null,
  verdict: 'ok',
  remarks: [],
  attempt: 1,
  outcome: 'done',
  failedReason: null,
  authorModel: 'a',
  review: { kind: 'answered', model: 'm' },
  source: 'text',
  dropped: [],
  ...patch,
});

export const run = (patch: Partial<WorldWriteRun> = {}): WorldWriteRun => ({
  id: 'd1',
  bookVersionId: 'v1',
  status: 'ready',
  language: 'ru',
  failedReason: null,
  waitingFor: null,
  operation: operation(),
  stepsTotal: 3,
  candidates: [{ key: 'anna', name: 'Anna', aliases: ['Annie'], chapters: [1, 2] }],
  pairs: [],
  leftOut: [],
  pairsOff: null,
  steps: [],
  items: [item()],
  droppedQuotes: [],
  droppedSources: [],
  createdAt: '2026-11-17T00:00:00.000Z',
  updatedAt: '2026-11-17T00:00:00.000Z',
  ...patch,
});
