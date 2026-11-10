import { describe, expect, it } from 'vitest';
import {
  hasLlmStageLabel,
  LLM_STAGE_LABELS,
  llmStageLabel,
  llmStageRunName,
} from '@/lib/admin/llm-stages';

describe('llm-stages', () => {
  it('каждому этапу настроек — название без подчёркиваний и пояснение', () => {
    // 18 этапов реестра бэкенда на 10.11.2026 (`*_STAGE` в модулях перевода, `T187`).
    expect(Object.keys(LLM_STAGE_LABELS)).toHaveLength(18);
    for (const [stage, label] of Object.entries(LLM_STAGE_LABELS)) {
      expect(label.title, stage).not.toContain('_');
      expect(label.title, stage).not.toBe(stage);
      expect(label.description.length, stage).toBeGreaterThan(10);
    }
  });

  it('этап без подписи — техническое имя без пояснения, и для имени из прототипа тоже', () => {
    expect(llmStageLabel('brand_new_stage')).toEqual({ title: 'brand_new_stage', description: '' });
    expect(llmStageLabel('constructor')).toEqual({ title: 'constructor', description: '' });
    expect(hasLlmStageLabel('constructor')).toBe(false);
    expect(hasLlmStageLabel('brand_new_stage')).toBe(false);
    expect(hasLlmStageLabel('translate')).toBe(true);
  });

  it('имя на экранах запуска — из того же словаря; кусок досье идёт под досье', () => {
    expect(llmStageRunName('check_semantic')).toBe('Meaning check');
    expect(llmStageRunName('check_language_jev')).toBe('Language review');
    expect(llmStageRunName('new_stage')).toBe('new_stage');
    expect(llmStageRunName('dossier_part')).toBe('Dossier');
    expect(llmStageRunName('summary_review')).toBe('summary_review');
    expect(llmStageRunName('toString')).toBe('toString');
  });
});
