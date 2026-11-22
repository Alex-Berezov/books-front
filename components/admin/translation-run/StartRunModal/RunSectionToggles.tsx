import type { FC } from 'react';
import { Checkbox } from 'antd';
import styles from './StartRunModal.module.scss';

/** Разделы языка, которые пишутся сами по его концу (Write Summary, Analysis, World). */
export interface RunSections {
  writeSummary: boolean;
  writeAnalysis: boolean;
  writeWorld: boolean;
}

/**
 * Умолчания окна запуска: Summary (F06, `product.md` §5) и Analysis (F07-3b, §8 п.12) включены;
 * World выключен до приёмки `F08-15` (решение арбитра `F08 | F08-9b`, Q6).
 */
export const RUN_SECTIONS_DEFAULT: RunSections = {
  writeSummary: true,
  writeAnalysis: true,
  writeWorld: false,
};

export interface RunSectionTogglesProps {
  value: RunSections;
  onChange: (next: RunSections) => void;
}

/**
 * Галочки разделов окна запуска. World живёт только вместе с Analysis: ход мира берёт героев
 * анализа (решение арбитра `F08 | F08-9b`, Q2) — без Analysis он неактивен и снимается вместе с ним.
 */
export const RunSectionToggles: FC<RunSectionTogglesProps> = ({ value, onChange }) => {
  const handleSummaryChange = (checked: boolean) => onChange({ ...value, writeSummary: checked });
  // Снятый Analysis снимает и World: иначе старт отказал бы 400 `WORLD_NEEDS_ANALYSIS`.
  const handleAnalysisChange = (checked: boolean) =>
    onChange({ ...value, writeAnalysis: checked, writeWorld: checked && value.writeWorld });
  const handleWorldChange = (checked: boolean) => onChange({ ...value, writeWorld: checked });

  return (
    <>
      <div className={styles.field}>
        <Checkbox
          checked={value.writeSummary}
          onChange={(e) => handleSummaryChange(e.target.checked)}
        >
          Write Summary
        </Checkbox>
        <span className={styles.muted}>
          When a language is translated, its summary starts on the Summary tab of its version. It is
          paid from its own limit: the run limit below does not cover it.
        </span>
      </div>
      <div className={styles.field}>
        <Checkbox
          checked={value.writeAnalysis}
          onChange={(e) => handleAnalysisChange(e.target.checked)}
        >
          Write Analysis
        </Checkbox>
        <span className={styles.muted}>
          When a language is translated, its analysis starts on the Analysis tab of its version. It
          is paid from its own limit: the run limit below does not cover it.
        </span>
      </div>
      <div className={styles.field}>
        <Checkbox
          checked={value.writeWorld && value.writeAnalysis}
          disabled={!value.writeAnalysis}
          onChange={(e) => handleWorldChange(e.target.checked)}
        >
          Write World
        </Checkbox>
        <span className={styles.muted}>
          When the analysis of a language is ready, its world starts on the World tab of its
          version. It needs Write Analysis and is paid from its own limit: the run limit below does
          not cover it.
        </span>
      </div>
    </>
  );
};
