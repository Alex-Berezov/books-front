'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Drawer, Slider, Skeleton, Tooltip } from 'antd';
import { ChevronLeft, ChevronRight, Settings, ArrowLeft, BookOpen, List } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useProgress, useUpdateTextProgress } from '@/api/hooks/useProgress';
import { useBookOverview, usePublicChapters } from '@/api/hooks/usePublic';
import { Button } from '@/components/common/Button';
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
  params: { lang: string; bookSlug: string; versionId: string };
};

export default function TextReaderPage({ params }: Props) {
  const { lang, bookSlug, versionId } = params;
  const supportedLang = lang as SupportedLang;
  const router = useRouter();

  // Fetch book overview for the header/metadata
  const { data: book } = useBookOverview(supportedLang, bookSlug);

  // Fetch public chapters for the text version
  const { data: chaptersData, isLoading } = usePublicChapters(versionId);
  const chapters = useMemo(() => chaptersData || [], [chaptersData]);

  const { data: session } = useSession();
  const { data: progressData } = useProgress(versionId, {
    enabled: !!session?.user,
  });

  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [hasRestoredProgress, setHasRestoredProgress] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>('md');
  const [lineHeight, setLineHeight] = useState(1.8);
  const [theme, setTheme] = useState<Theme>('light');
  const [showToc, setShowToc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (chapters.length > 0 && progressData && !hasRestoredProgress) {
      if (progressData.chapterId) {
        const idx = chapters.findIndex((c) => c.id === progressData.chapterId);
        if (idx !== -1) {
          setCurrentChapterIndex(idx);
        }
      }
      setHasRestoredProgress(true);
    }
  }, [chapters, progressData, hasRestoredProgress]);

  const contentRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentChapter = chapters[currentChapterIndex];

  // Progress update mutation
  const updateProgressMutation = useUpdateTextProgress(versionId);

  const saveProgress = useCallback(
    (chapter: ChapterDetail) => {
      const percentage =
        chapters.length > 0 ? Math.round(((currentChapterIndex + 1) / chapters.length) * 100) : 0;
      updateProgressMutation.mutate({
        versionId,
        chapterId: chapter.id,
        position: 0,
        percentage,
      });
    },
    [chapters.length, currentChapterIndex, versionId, updateProgressMutation]
  );

  // Keep save progress ref to avoid dependency changes re-triggering effects
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

  // Reset scroll position only when chapter index changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [currentChapterIndex]);

  // Trigger progress save timer when chapter index/content changes
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
        <Skeleton.Button active style={{ width: 200, height: 28, marginBottom: 16 }} />
        <Skeleton.Button active style={{ width: 120, height: 20, marginBottom: 32 }} />
        <div className={styles.skeletonTextLines}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} active paragraph={{ rows: 1 }} title={false} />
          ))}
        </div>
      </div>
    );
  }

  const themeStyles = themeMap[theme];

  return (
    <div className={`${styles.readerPage} ${themeStyles.class}`}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            variant="ghost"
            shape="circle"
            leftIcon={<ArrowLeft size={18} />}
            onClick={() => router.back()}
            className={styles.iconBtn}
          />
          <div className={styles.bookInfo}>
            <span className={styles.bookTitle}>{book?.title}</span>
            {currentChapter && <span className={styles.chapterTitle}>{currentChapter.title}</span>}
          </div>
        </div>

        <div className={styles.headerRight}>
          <Tooltip title="Table of contents">
            <Button
              variant="ghost"
              shape="circle"
              leftIcon={<List size={18} />}
              onClick={() => setShowToc(true)}
              className={styles.iconBtn}
            />
          </Tooltip>
          <Tooltip title="Settings">
            <Button
              variant="ghost"
              shape="circle"
              leftIcon={<Settings size={18} />}
              onClick={() => setShowSettings(true)}
              className={styles.iconBtn}
            />
          </Tooltip>
        </div>
      </header>

      {/* Table of Contents Drawer */}
      <Drawer
        title="Table of Contents"
        placement="left"
        onClose={() => setShowToc(false)}
        open={showToc}
        className={styles.drawer}
        width={280}
      >
        <div className={styles.tocList}>
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
            >
              <span className={styles.tocNumber}>{idx + 1}.</span>
              <span className={styles.tocTitle}>{ch.title}</span>
            </button>
          ))}
        </div>
      </Drawer>

      {/* Settings Drawer */}
      <Drawer
        title="Reading Settings"
        placement="right"
        onClose={() => setShowSettings(false)}
        open={showSettings}
        className={styles.drawer}
        width={280}
      >
        <div className={styles.settingsSection}>
          <h4 className={styles.settingsTitle}>Theme</h4>
          <div className={styles.themeSelector}>
            {(Object.keys(themeMap) as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`${styles.themeBtn} ${styles[`themeBtn-${t}`]} ${
                  theme === t ? styles.activeThemeBtn : ''
                }`}
              >
                {themeMap[t].label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.settingsSection}>
          <h4 className={styles.settingsTitle}>Font Size</h4>
          <div className={styles.fontSizeSelector}>
            {(Object.keys(fontSizeMap) as FontSize[]).map((size) => (
              <button
                key={size}
                onClick={() => setFontSize(size)}
                className={`${styles.fontSizeBtn} ${
                  fontSize === size ? styles.activeFontSizeBtn : ''
                }`}
              >
                {size.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.settingsSection}>
          <h4 className={styles.settingsTitle}>Line Height ({lineHeight})</h4>
          <Slider
            min={1.2}
            max={2.4}
            step={0.2}
            value={lineHeight}
            onChange={(v) => setLineHeight(v)}
            tooltip={{ formatter: (v) => `${v}` }}
          />
        </div>
      </Drawer>

      {/* Main Content Area */}
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
              <BookOpen size={48} className={styles.emptyIcon} />
              <p className={styles.emptyText}>No chapters available for this book version.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <footer className={styles.footer}>
        <Button
          variant="ghost"
          onClick={goToPrevChapter}
          disabled={currentChapterIndex === 0}
          leftIcon={<ChevronLeft size={16} />}
          className={styles.footerBtn}
        >
          Prev
        </Button>

        <div className={styles.progressContainer}>
          <span className={styles.progressText}>
            {chapters.length > 0
              ? `Chapter ${currentChapterIndex + 1} of ${chapters.length}`
              : 'No chapters'}
          </span>
          <div className={styles.progressBarBg}>
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

        <Button
          variant="ghost"
          onClick={goToNextChapter}
          disabled={currentChapterIndex >= chapters.length - 1}
          rightIcon={<ChevronRight size={16} />}
          className={styles.footerBtn}
        >
          Next
        </Button>
      </footer>
    </div>
  );
}
