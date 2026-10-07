'use client';

import { useEffect, useLayoutEffect, useRef, useState, type FC } from 'react';
import { ChevronLeft, ChevronRight, Settings, ArrowLeft, BookOpen, List } from 'lucide-react';
import { RichTextContent } from '@/components/common/RichTextContent';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { FontSize, LineHeightIndex, Theme } from './ReaderView.constants';
import type { ReaderViewProps } from './ReaderView.types';
import { ReaderDrawer } from './ReaderDrawer';
import { ReaderSettings } from './ReaderSettings';
import { DEFAULT_LINE_HEIGHT_INDEX } from './ReaderView.constants';
import styles from './ReaderView.module.scss';

const lineHeightMap: Record<LineHeightIndex, string> = {
  0: styles.lineHeight12,
  1: styles.lineHeight14,
  2: styles.lineHeight16,
  3: styles.lineHeight18,
  4: styles.lineHeight20,
  5: styles.lineHeight22,
  6: styles.lineHeight24,
};

const fontSizeMap: Record<FontSize, string> = {
  sm: styles.fontSizeSm,
  md: styles.fontSizeMd,
  lg: styles.fontSizeLg,
  xl: styles.fontSizeXl,
};

const themeMap: Record<Theme, string> = {
  light: styles.themeLight,
  sepia: styles.themeSepia,
  dark: styles.themeDark,
};

/**
 * What a reader sees of a book's text: header, table of contents, reading
 * settings, the chapter itself and prev/next.
 *
 * Pure presentation. Where the chapters come from and what happens to the
 * position - restore, save, slug canonicalisation, rights blocking - stays with
 * the caller. That is what lets the admin draft preview show a book through the
 * very same view a reader gets, without writing anybody's reading progress.
 */
export const ReaderView: FC<ReaderViewProps> = (props) => {
  const { title, chapters, currentChapterIndex, onChapterChange, onBack, notice } = props;
  const { t } = useTranslation();

  const [fontSize, setFontSize] = useState<FontSize>('md');
  const [lineHeightIndex, setLineHeightIndex] =
    useState<LineHeightIndex>(DEFAULT_LINE_HEIGHT_INDEX);
  const [theme, setTheme] = useState<Theme>('light');
  const [showToc, setShowToc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);

  const currentChapter = chapters[currentChapterIndex];

  const currentChapterId = currentChapter?.id;

  // Keyed on the chapter, not its position: in the admin preview a chapter inserted
  // before the current one shifts the index without changing the text on screen,
  // and a deleted one swaps the text at the same index.
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [currentChapterId]);

  // The bar width is computed, so it goes in as a css variable through the ref:
  // a `style` prop is a lint error here (LEGACY-050).
  useLayoutEffect(() => {
    const share = chapters.length > 0 ? ((currentChapterIndex + 1) / chapters.length) * 100 : 0;
    progressFillRef.current?.style.setProperty('--reader-progress', `${share}%`);
  }, [currentChapterIndex, chapters.length]);

  const goToPrevChapter = () => {
    if (currentChapterIndex > 0) onChapterChange(currentChapterIndex - 1);
  };

  const goToNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) onChapterChange(currentChapterIndex + 1);
  };

  return (
    <div className={`${styles.readerPage} ${themeMap[theme]}`}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            onClick={onBack}
            className={styles.iconBtn}
            aria-label={t('book.back')}
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <div className={styles.bookInfo}>
            <span className={styles.bookTitle}>{title}</span>
            {currentChapter && <span className={styles.chapterTitle}>{currentChapter.title}</span>}
          </div>
        </div>
        <div className={styles.headerRight}>
          <button
            type="button"
            title={t('reader.toc')}
            onClick={() => setShowToc(true)}
            className={styles.iconBtn}
            aria-label={t('reader.toc')}
            aria-controls="toc-drawer"
            aria-expanded={showToc}
          >
            <List size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            title={t('reader.settings')}
            onClick={() => setShowSettings(true)}
            className={styles.iconBtn}
            aria-label={t('reader.settings')}
            aria-controls="settings-drawer"
            aria-expanded={showSettings}
          >
            <Settings size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      {notice}

      {showToc && (
        <ReaderDrawer
          id="toc-drawer"
          title={t('reader.toc')}
          side="left"
          onClose={() => setShowToc(false)}
        >
          <nav className={styles.drawerBody} aria-label={t('reader.toc')}>
            {chapters.map((ch, idx) => (
              <button
                key={ch.id}
                onClick={() => {
                  onChapterChange(idx);
                  setShowToc(false);
                }}
                className={`${styles.tocItem} ${
                  idx === currentChapterIndex ? styles.activeTocItem : ''
                }`}
                aria-current={idx === currentChapterIndex ? 'location' : undefined}
              >
                <span className={styles.tocNumber}>{idx + 1}.</span>
                <span className={styles.tocTitle}>{ch.title}</span>
              </button>
            ))}
          </nav>
        </ReaderDrawer>
      )}

      {showSettings && (
        <ReaderDrawer
          id="settings-drawer"
          title={t('reader.settings')}
          side="right"
          onClose={() => setShowSettings(false)}
        >
          <ReaderSettings
            theme={theme}
            fontSize={fontSize}
            lineHeightIndex={lineHeightIndex}
            onThemeChange={setTheme}
            onFontSizeChange={setFontSize}
            onLineHeightChange={setLineHeightIndex}
          />
        </ReaderDrawer>
      )}

      <div ref={contentRef} className={styles.contentArea}>
        <div className={styles.contentContainer}>
          {currentChapter ? (
            <article>
              <h1 className={styles.chapterHeader}>{currentChapter.title}</h1>
              <RichTextContent
                html={currentChapter.content || ''}
                className={`${styles.chapterBody} ${fontSizeMap[fontSize]} ${lineHeightMap[lineHeightIndex]}`}
              />
            </article>
          ) : (
            <div className={styles.emptyState}>
              <BookOpen size={48} className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyText}>{t('reader.noChapters')}</p>
            </div>
          )}
        </div>
      </div>

      <footer className={styles.footer}>
        <nav aria-label={t('a11y.footerNavigation')} className={styles.footerNav}>
          <button
            type="button"
            onClick={goToPrevChapter}
            disabled={currentChapterIndex === 0}
            className={styles.footerBtn}
            aria-label={t('a11y.prevChapter')}
          >
            <ChevronLeft size={16} aria-hidden="true" /> {t('reader.prev')}
          </button>

          <div className={styles.progressContainer}>
            <span className={styles.progressText}>
              {chapters.length > 0
                ? `${t('reader.chapterProgress')} ${currentChapterIndex + 1} ${t('reader.of')} ${chapters.length}`
                : t('reader.noChaptersLabel')}
            </span>
            <div className={styles.progressBarBg} aria-hidden="true">
              <div ref={progressFillRef} className={styles.progressBarFill} />
            </div>
          </div>

          <button
            type="button"
            onClick={goToNextChapter}
            disabled={currentChapterIndex >= chapters.length - 1}
            className={styles.footerBtn}
            aria-label={t('a11y.nextChapter')}
          >
            {t('reader.next')} <ChevronRight size={16} aria-hidden="true" />
          </button>
        </nav>
      </footer>
    </div>
  );
};
