'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ArrowLeft,
  List,
  RotateCcw,
  RotateCw,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useBookOverview } from '@/api/hooks/usePublic';
import {
  usePublicAudioChapters,
  useRecordView,
  useUpdateAudioProgress,
} from '@/api/hooks/usePublicAudio';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './player.module.scss';

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const PROGRESS_SAVE_THROTTLE_MS = 5000;

type Props = {
  params: { lang: string; slug: string };
};

export default function ListenClient({ params }: Props) {
  const { lang, slug } = params;
  const supportedLang = lang as SupportedLang;
  const router = useRouter();
  const { t } = useTranslation();

  const { data: book, isLoading: loadingBook } = useBookOverview(supportedLang, slug);
  const versionId = book?.versionIds?.audio || '';

  useEffect(() => {
    if (book && book.slug && book.slug !== slug) {
      router.replace(`/${lang}/book/${book.slug}/listen`);
    }
  }, [book, slug, lang, router]);

  const {
    data: chaptersData,
    isLoading: loadingChapters,
    error,
  } = usePublicAudioChapters(versionId, undefined, { enabled: !!versionId });
  const chapters = useMemo(() => chaptersData?.items ?? [], [chaptersData?.items]);

  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showChapters, setShowChapters] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSaveRef = useRef(0);
  const hasRecordedViewRef = useRef(false);

  const currentChapter = chapters[currentChapterIndex];

  const recordViewMutation = useRecordView();
  const updateProgressMutation = useUpdateAudioProgress(versionId);

  useEffect(() => {
    if (chapters.length > 0 && currentChapterIndex >= chapters.length) {
      setCurrentChapterIndex(0);
    }
  }, [chapters, currentChapterIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const now = Date.now();
      if (now - lastSaveRef.current >= PROGRESS_SAVE_THROTTLE_MS && currentChapter) {
        lastSaveRef.current = now;
        updateProgressMutation.mutate({
          audioChapterNumber: currentChapter.number,
          position: Math.max(0, Math.floor(audio.currentTime)),
        });
      }
    };

    const onDurationChange = () => setDuration(audio.duration);
    const onEnded = () => {
      if (currentChapterIndex < chapters.length - 1) {
        setCurrentChapterIndex((i) => i + 1);
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
    };
  }, [currentChapterIndex, chapters.length, currentChapter, updateProgressMutation]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
      if (!hasRecordedViewRef.current && versionId) {
        hasRecordedViewRef.current = true;
        recordViewMutation.mutate({ versionId, source: 'audio' });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, recordViewMutation, versionId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentChapter?.audioUrl) return;

    audio.src = currentChapter.audioUrl;
    audio.load();
    setCurrentTime(0);
    lastSaveRef.current = 0;

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChapterIndex, currentChapter?.audioUrl]);

  const handleSeek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  const handleSkip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + seconds));
  };

  if (loadingBook || (loadingChapters && versionId)) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.skeletonCover} />
        <div className={styles.skeletonText}>
          <div
            className={styles.skeletonBlock}
            style={{ width: '100%', height: 16, marginBottom: 8 }}
          />
          <div className={styles.skeletonBlock} style={{ width: '60%', height: 12 }} />
        </div>
      </div>
    );
  }

  if (error || chapters.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorText}>
          {chapters.length === 0 ? t('player.noChapters') : t('player.chaptersFail')}
        </p>
        <button type="button" onClick={() => router.back()} className={styles.secondaryBtn}>
          {t('player.goBack')}
        </button>
      </div>
    );
  }

  const coverColor = book?.coverUrl ? 'transparent' : '#4a7c59';

  return (
    <div className={styles.playerPage}>
      <audio ref={audioRef} preload="metadata" />

      <header className={styles.header}>
        <button
          type="button"
          onClick={() => router.back()}
          className={styles.backBtn}
          aria-label={t('book.back')}
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <span className={styles.headerTitle}>{t('player.nowPlaying')}</span>
        <button
          type="button"
          onClick={() => setShowChapters(true)}
          className={styles.listBtn}
          aria-label={t('player.chapters')}
          aria-controls="chapters-drawer"
          aria-expanded={showChapters}
        >
          <List size={18} aria-hidden="true" />
        </button>
      </header>

      {showChapters && (
        <div
          className={styles.drawerOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowChapters(false);
          }}
          role="presentation"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowChapters(false);
          }}
        >
          <div
            className={`${styles.drawerPanel} ${styles.drawerRight}`}
            role="dialog"
            aria-label={t('player.chapters')}
            id="chapters-drawer"
          >
            <div className={styles.drawerHeader}>
              <span className={styles.drawerTitle}>{t('player.chapters')}</span>
              <button
                type="button"
                onClick={() => setShowChapters(false)}
                className={styles.drawerClose}
                aria-label={t('a11y.close') || 'Close'}
              >
                <X size={18} />
              </button>
            </div>
            <nav className={styles.chapterList} aria-label={t('player.chapters')}>
              {chapters.map((ch, idx) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    setCurrentChapterIndex(idx);
                    setShowChapters(false);
                    setIsPlaying(true);
                  }}
                  className={`${styles.chapterItem} ${
                    idx === currentChapterIndex ? styles.activeChapterItem : ''
                  }`}
                >
                  <span className={styles.chapterNumber}>{ch.number}.</span>
                  <span className={styles.chapterTitleText}>{ch.title}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      <div className={styles.main}>
        <div className={styles.coverContainer} style={{ backgroundColor: coverColor }}>
          {book?.coverUrl ? (
            <Image
              src={book.coverUrl}
              alt={t('a11y.bookCover')
                .replace('{title}', book.title || '')
                .replace('{author}', book.author || t('book.unknownAuthor'))}
              className={styles.coverImage}
              width={200}
              height={200}
              priority
            />
          ) : (
            <span className={styles.coverLetter}>{book?.title?.[0] || '?'}</span>
          )}
        </div>

        <div className={styles.details}>
          <h1 className={styles.title}>{book?.title}</h1>
          <p className={styles.author}>{book?.author}</p>
          {currentChapter && <p className={styles.chapterTitle}>{currentChapter.title}</p>}
        </div>

        <div className={styles.timeline}>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={1}
            value={currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className={styles.nativeSlider}
            aria-label={t('a11y.audioProgress')}
          />
          <div className={styles.timeLabels}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className={styles.controls}>
          <button
            type="button"
            onClick={() => setCurrentChapterIndex((i) => Math.max(0, i - 1))}
            disabled={currentChapterIndex === 0}
            className={styles.controlBtn}
            aria-label={t('a11y.prevChapter')}
          >
            <SkipBack size={22} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => handleSkip(-15)}
            className={styles.controlBtn}
            aria-label={t('a11y.skipBack')}
          >
            <RotateCcw size={22} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={styles.playBtn}
            aria-label={isPlaying ? t('a11y.pause') : t('a11y.play')}
          >
            {isPlaying ? (
              <Pause size={30} fill="currentColor" aria-hidden="true" />
            ) : (
              <Play size={30} fill="currentColor" className={styles.playIcon} aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSkip(15)}
            className={styles.controlBtn}
            aria-label={t('a11y.skipForward')}
          >
            <RotateCw size={22} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setCurrentChapterIndex((i) => Math.min(chapters.length - 1, i + 1))}
            disabled={currentChapterIndex === chapters.length - 1}
            className={styles.controlBtn}
            aria-label={t('a11y.nextChapter')}
          >
            <SkipForward size={22} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.footerControls}>
          <div className={styles.speedControl}>
            <label htmlFor="playback-speed-select" className={styles.label}>
              {t('player.speed')}:
            </label>
            <select
              id="playback-speed-select"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className={styles.speedSelect}
            >
              {SPEEDS.map((s) => (
                <option key={s} value={s}>
                  {s}x
                </option>
              ))}
            </select>
          </div>

          <div className={styles.volumeControl}>
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className={styles.volumeBtn}
              aria-label={isMuted || volume === 0 ? t('a11y.unmute') : t('a11y.mute')}
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={18} aria-hidden="true" />
              ) : (
                <Volume2 size={18} aria-hidden="true" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                if (v > 0) setIsMuted(false);
              }}
              className={styles.nativeSlider}
              aria-label={t('a11y.volume')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
