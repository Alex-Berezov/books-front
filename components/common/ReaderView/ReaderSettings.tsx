'use client';

import type { FC } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { FontSize, LineHeightIndex, Theme } from './ReaderView.constants';
import { FONT_SIZES, LINE_HEIGHTS, THEMES } from './ReaderView.constants';
import styles from './ReaderView.module.scss';

interface ReaderSettingsProps {
  theme: Theme;
  fontSize: FontSize;
  lineHeightIndex: LineHeightIndex;
  onThemeChange: (theme: Theme) => void;
  onFontSizeChange: (size: FontSize) => void;
  onLineHeightChange: (index: LineHeightIndex) => void;
}

/** Body of the settings drawer: theme, font size, line height. */
export const ReaderSettings: FC<ReaderSettingsProps> = (props) => {
  const { theme, fontSize, lineHeightIndex, onThemeChange, onFontSizeChange, onLineHeightChange } =
    props;
  const { t } = useTranslation();

  return (
    <div className={styles.drawerBody}>
      <div className={styles.settingsSection} role="group" aria-label={t('reader.theme')}>
        <h4 className={styles.settingsTitle}>{t('reader.theme')}</h4>
        <div className={styles.themeSelector}>
          {THEMES.map((tKey) => (
            <button
              key={tKey}
              onClick={() => onThemeChange(tKey)}
              className={`${styles.themeBtn} ${styles[`themeBtn-${tKey}`]} ${
                theme === tKey ? styles.activeThemeBtn : ''
              }`}
              aria-pressed={theme === tKey}
            >
              {t(`reader.themes.${tKey}`)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.settingsSection} role="group" aria-label={t('reader.fontSize')}>
        <h4 className={styles.settingsTitle}>{t('reader.fontSize')}</h4>
        <div className={styles.fontSizeSelector}>
          {FONT_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => onFontSizeChange(size)}
              className={`${styles.fontSizeBtn} ${
                fontSize === size ? styles.activeFontSizeBtn : ''
              }`}
              aria-pressed={fontSize === size}
            >
              {size.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.settingsSection}>
        <h4 className={styles.settingsTitle}>
          {t('reader.lineHeight')} ({LINE_HEIGHTS[lineHeightIndex]})
        </h4>
        <input
          type="range"
          min={0}
          max={LINE_HEIGHTS.length - 1}
          step={1}
          value={lineHeightIndex}
          onChange={(e) => onLineHeightChange(Number(e.target.value) as LineHeightIndex)}
          className={styles.nativeSlider}
          aria-label={t('reader.lineHeight')}
          aria-valuetext={String(LINE_HEIGHTS[lineHeightIndex])}
        />
      </div>
    </div>
  );
};
