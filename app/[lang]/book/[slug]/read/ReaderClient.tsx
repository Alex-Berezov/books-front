'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Settings, ArrowLeft, BookOpen, List, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useUpdateTextProgress } from '@/api/hooks/useProgress';
import { useReaderBootstrap } from '@/api/hooks/usePublic';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { ChapterDetail } from '@/types/api-schema';
import styles from './reader.module.scss';

type FontSize = 'sm' | 'md' | 'lg' | 'xl';
type Theme = 'light' | 'sepia' | 'dark';

const fontSizeMap: Record<FontSize, string> = {
  sm: styles.fontSizeSm,
  md: styles.fontSizeMd,
  lg: styles.fontSizeLg,
  xl: styles.fontSizeXl,
};

const themeMap: Record<Theme, { bg: string; text: string; label: string; class: string }> = {
  light: { bg: '#ffffff', text: '#111827', label: 'Light', class: styles.themeLight },
  sepia: { bg: '#fdf6e3', text: '#5c4636', label: 'Sepia', class: styles.themeSepia },
  dark: { bg: '#111827', text: '#f9fafb', label: 'Dark', class: styles.themeDark },
};

type Props = {
  params: { lang: string; slug: string };
};

export default function ReaderClient({ params }: Props) {
  const { lang, slug } = params;
  const supportedLang = lang as SupportedLang;
  const router = useRouter();
  const { t } = useTranslation();
  const { data: session } = useSession();

  const { data: bootstrapData, isLoading } = useReaderBootstrap(
    supportedLang,
    slug,
    session?.user ? (session.user as { id?: string }).id || undefined : undefined
  );

  const chapters = useMemo(() => bootstrapData?.chapters || [], [bootstrapData]);
  const versionId = bootstrapData?.versionId || '';

  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [hasRestoredProgress, setHasRestoredProgress] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>('md');
  const [lineHeight, setLineHeight] = useState(1.8);
  const [theme, setTheme] = useState<Theme>('light');
  const [showToc, setShowToc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (chapters.length > 0 && bootstrapData?.lastProgress && !hasRestoredProgress) {
      if (bootstrapData.lastProgress.chapterNumber) {
        const idx = chapters.findIndex(
          (c) => c.number === bootstrapData.lastProgress?.chapterNumber
        );
        if (idx !== -1) {
          setCurrentChapterIndex(idx);
        }
      }
      setHasRestoredProgress(true);
    }
  }, [chapters, bootstrapData, hasRestoredProgress]);

  useEffect(() => {
    if (bootstrapData && bootstrapData.slug && bootstrapData.slug !== slug) {
      router.replace(`/${lang}/book/${bootstrapData.slug}/read`);
    }
  }, [bootstrapData, slug, lang, router]);

  const contentRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentChapter = chapters[currentChapterIndex];

  const updateProgressMutation = useUpdateTextProgress(versionId);

  const saveProgress = useCallback(
    (chapter: ChapterDetail) => {
      if (!versionId) return;
      updateProgressMutation.mutate({
        chapterNumber: chapter.number,
        position: 0,
      });
    },
    [updateProgressMutation, versionId]
  );

  const saveProgressRef = useRef(saveProgress);
  useEffect(() => {
    saveProgressRef.current = saveProgress;
  }, [saveProgress]);

  const debouncedSave = useCallback((chapter: ChapterDetail) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveProgressRef.current(chapter);
    }, 3000);
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [currentChapterIndex]);

  useEffect(() => {
    if (currentChapter) {
      debouncedSave(currentChapter);
    }
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [currentChapterIndex, currentChapter, debouncedSave]);

  const goToPrevChapter = () => {
    if (currentChapterIndex > 0) setCurrentChapterIndex((i) => i - 1);
  };

  const goToNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) setCurrentChapterIndex((i) => i + 1);
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div
          className={styles.skeletonBlock}
          style={{ width: 200, height: 28, marginBottom: 16 }}
        />
        <div
          className={styles.skeletonBlock}
          style={{ width: 120, height: 20, marginBottom: 32 }}
        />
        <div className={styles.skeletonTextLines}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={styles.skeletonBlock}
              style={{ width: '100%', height: 16, marginBottom: 12 }}
            />
          ))}
        </div>
      </div>
    );
  }

  const themeStyles = themeMap[theme];

  return (
    <div className={`${styles.readerPage} ${themeStyles.class}`}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            onClick={() => router.back()}
            className={styles.iconBtn}
            aria-label={t('book.back')}
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <div className={styles.bookInfo}>
            <span className={styles.bookTitle}>{bootstrapData?.title}</span>
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

      {/* TOC Drawer */}
      {showToc && (
        <div
          className={styles.drawerOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowToc(false);
          }}
          role="presentation"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowToc(false);
          }}
        >
          <div
            className={`${styles.drawerPanel} ${styles.drawerLeft}`}
            role="dialog"
            aria-label={t('reader.toc')}
            id="toc-drawer"
          >
            <div className={styles.drawerHeader}>
              <span className={styles.drawerTitle}>{t('reader.toc')}</span>
              <button
                type="button"
                onClick={() => setShowToc(false)}
                className={styles.drawerClose}
                aria-label={t('a11y.close') || 'Close'}
              >
                <X size={18} />
              </button>
            </div>
            <nav className={styles.drawerBody} aria-label={t('reader.toc')}>
              {chapters.map((ch, idx) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    setCurrentChapterIndex(idx);
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
          </div>
        </div>
      )}

      {/* Settings Drawer */}
      {showSettings && (
        <div
          className={styles.drawerOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSettings(false);
          }}
          role="presentation"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowSettings(false);
          }}
        >
          <div
            className={`${styles.drawerPanel} ${styles.drawerRight}`}
            role="dialog"
            aria-label={t('reader.settings')}
            id="settings-drawer"
          >
            <div className={styles.drawerHeader}>
              <span className={styles.drawerTitle}>{t('reader.settings')}</span>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className={styles.drawerClose}
                aria-label={t('a11y.close') || 'Close'}
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles.drawerBody}>
              <div className={styles.settingsSection} role="group" aria-label={t('reader.theme')}>
                <h4 className={styles.settingsTitle}>{t('reader.theme')}</h4>
                <div className={styles.themeSelector}>
                  {(Object.keys(themeMap) as Theme[]).map((tKey) => (
                    <button
                      key={tKey}
                      onClick={() => setTheme(tKey)}
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

              <div
                className={styles.settingsSection}
                role="group"
                aria-label={t('reader.fontSize')}
              >
                <h4 className={styles.settingsTitle}>{t('reader.fontSize')}</h4>
                <div className={styles.fontSizeSelector}>
                  {(Object.keys(fontSizeMap) as FontSize[]).map((size) => (
                    <button
                      key={size}
                      onClick={() => setFontSize(size)}
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
                  {t('reader.lineHeight')} ({lineHeight})
                </h4>
                <input
                  type="range"
                  min={1.2}
                  max={2.4}
                  step={0.2}
                  value={lineHeight}
                  onChange={(e) => setLineHeight(Number(e.target.value))}
                  className={styles.nativeSlider}
                  aria-label={t('reader.lineHeight')}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={contentRef} className={styles.contentArea}>
        <div className={styles.contentContainer}>
          {currentChapter ? (
            <article>
              <h1 className={styles.chapterHeader}>{currentChapter.title}</h1>
              <div
                className={`${styles.chapterBody} ${fontSizeMap[fontSize]}`}
                style={{ lineHeight: lineHeight }}
                dangerouslySetInnerHTML={{ __html: currentChapter.content || '' }}
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
        <nav
          aria-label={t('a11y.footerNavigation') || 'Reader chapter navigation'}
          style={{ display: 'contents' }}
        >
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
              <div
                className={styles.progressBarFill}
                style={{
                  width:
                    chapters.length > 0
                      ? `${((currentChapterIndex + 1) / chapters.length) * 100}%`
                      : '0%',
                }}
              />
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
}
