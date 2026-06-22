'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Drawer, Slider, Skeleton } from 'antd';
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
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useBookOverview } from '@/api/hooks/usePublic';
import {
  usePublicAudioChapters,
  useRecordView,
  useUpdateAudioProgress,
} from '@/api/hooks/usePublicAudio';
import { Button } from '@/components/common/Button';
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

  // Fetch book details to resolve the audioVersion.id (similar to the legacy flow but resolving first via overview)
  const { data: book, isLoading: loadingBook } = useBookOverview(supportedLang, slug);
  const versionId = book?.versionIds?.audio || '';

  // Redirect if URL slug is incorrect for this language
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

  // API hooks for view recording and progress
  const recordViewMutation = useRecordView();
  const updateProgressMutation = useUpdateAudioProgress(versionId);

  // Select first chapter on load
  useEffect(() => {
    if (chapters.length > 0 && currentChapterIndex >= chapters.length) {
      setCurrentChapterIndex(0);
    }
  }, [chapters, currentChapterIndex]);

  // Audio elements listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Progress saving throttle logic
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

  // Handle Play/Pause
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

  // Handle Volume & Mute
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Handle Playback Rate (Speed)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = speed;
  }, [speed]);

  // Handle chapter switch
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
        <Skeleton.Avatar active size={180} shape="square" className={styles.skeletonCover} />
        <Skeleton active paragraph={{ rows: 2 }} className={styles.skeletonText} />
      </div>
    );
  }

  if (error || chapters.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorText}>
          {chapters.length === 0 ? t('player.noChapters') : t('player.chaptersFail')}
        </p>
        <Button variant="secondary" onClick={() => router.back()}>
          {t('player.goBack')}
        </Button>
      </div>
    );
  }

  const coverColor = book?.coverUrl ? 'transparent' : '#4a7c59';

  return (
    <div className={styles.playerPage}>
      <audio ref={audioRef} preload="metadata" />

      {/* Header */}
      <header className={styles.header}>
        <Button
          variant="ghost"
          shape="circle"
          leftIcon={<ArrowLeft size={18} aria-hidden="true" />}
          onClick={() => router.back()}
          className={styles.backBtn}
          aria-label={t('book.back')}
        />
        <span className={styles.headerTitle}>{t('player.nowPlaying')}</span>
        <Button
          variant="ghost"
          shape="circle"
          leftIcon={<List size={18} aria-hidden="true" />}
          onClick={() => setShowChapters(true)}
          className={styles.listBtn}
          aria-label={t('player.chapters')}
          aria-controls="chapters-drawer"
          aria-expanded={showChapters}
        />
      </header>

      {/* Chapters Drawer */}
      <Drawer
        title={t('player.chapters')}
        placement="right"
        onClose={() => setShowChapters(false)}
        open={showChapters}
        className={styles.drawer}
        width={280}
        id="chapters-drawer"
      >
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
      </Drawer>

      {/* Player Main Panel */}
      <div className={styles.main}>
        {/* Album Art Cover */}
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

        {/* Book & Chapter details */}
        <div className={styles.details}>
          <h1 className={styles.title}>{book?.title}</h1>
          <p className={styles.author}>{book?.author}</p>
          {currentChapter && <p className={styles.chapterTitle}>{currentChapter.title}</p>}
        </div>

        {/* Timeline Slider */}
        <div className={styles.timeline}>
          <Slider
            min={0}
            max={duration || 100}
            step={1}
            value={currentTime}
            onChange={handleSeek}
            tooltip={{ formatter: (v) => formatTime(v || 0) }}
            className={styles.slider}
            aria-label={t('a11y.audioProgress')}
          />
          <div className={styles.timeLabels}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Player Core Controls */}
        <div className={styles.controls}>
          <Button
            variant="ghost"
            shape="circle"
            leftIcon={<SkipBack size={22} aria-hidden="true" />}
            onClick={() => setCurrentChapterIndex((i) => Math.max(0, i - 1))}
            disabled={currentChapterIndex === 0}
            className={styles.controlBtn}
            aria-label={t('a11y.prevChapter')}
          />

          <Button
            variant="ghost"
            shape="circle"
            leftIcon={<RotateCcw size={22} aria-hidden="true" />}
            onClick={() => handleSkip(-15)}
            className={styles.controlBtn}
            aria-label={t('a11y.skipBack')}
          />

          <button
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

          <Button
            variant="ghost"
            shape="circle"
            leftIcon={<RotateCw size={22} aria-hidden="true" />}
            onClick={() => handleSkip(15)}
            className={styles.controlBtn}
            aria-label={t('a11y.skipForward')}
          />

          <Button
            variant="ghost"
            shape="circle"
            leftIcon={<SkipForward size={22} aria-hidden="true" />}
            onClick={() => setCurrentChapterIndex((i) => Math.min(chapters.length - 1, i + 1))}
            disabled={currentChapterIndex === chapters.length - 1}
            className={styles.controlBtn}
            aria-label={t('a11y.nextChapter')}
          />
        </div>

        {/* Bottom controls panel (Volume & Speed selector) */}
        <div className={styles.bottomControls}>
          {/* Speed settings dropdown */}
          <div className={styles.speedControl}>
            <label htmlFor="playback-speed-select" className={styles.label}>
              {t('player.speed') || t('a11y.playbackSpeed')}:
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

          {/* Volume slider */}
          <div className={styles.volumeControl}>
            <Button
              variant="ghost"
              shape="circle"
              leftIcon={
                isMuted || volume === 0 ? (
                  <VolumeX size={18} aria-hidden="true" />
                ) : (
                  <Volume2 size={18} aria-hidden="true" />
                )
              }
              onClick={() => setIsMuted(!isMuted)}
              className={styles.volumeBtn}
              aria-label={isMuted || volume === 0 ? t('a11y.unmute') : t('a11y.mute')}
            />
            <Slider
              min={0}
              max={1}
              step={0.1}
              value={isMuted ? 0 : volume}
              onChange={(v) => {
                setVolume(v);
                if (v > 0) setIsMuted(false);
              }}
              className={styles.volumeSlider}
              aria-label={t('a11y.volume')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
