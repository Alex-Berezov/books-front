'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Button, Drawer, Slider, Skeleton } from 'antd';
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
import { useRouter } from 'next/navigation';
import { useBookOverview } from '@/api/hooks/usePublic';
import {
  usePublicAudioChapters,
  useRecordView,
  useUpdateAudioProgress,
} from '@/api/hooks/usePublicAudio';
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
  params: { lang: string; bookSlug: string; versionId: string };
};

export default function AudioPlayerPage({ params }: Props) {
  const { lang, bookSlug, versionId } = params;
  const supportedLang = lang as SupportedLang;
  const router = useRouter();

  // Fetch book details
  const { data: book, isLoading: loadingBook } = useBookOverview(supportedLang, bookSlug);

  // Fetch audio chapters list for this version
  const {
    data: chaptersData,
    isLoading: loadingChapters,
    error,
  } = usePublicAudioChapters(versionId);
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
      if (!hasRecordedViewRef.current) {
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

  if (loadingBook || loadingChapters) {
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
          {chapters.length === 0
            ? 'This audiobook has no chapters yet.'
            : 'Failed to load audio chapters.'}
        </p>
        <Button onClick={() => router.back()}>Go Back</Button>
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
          type="text"
          icon={<ArrowLeft size={18} />}
          onClick={() => router.back()}
          className={styles.backBtn}
        />
        <span className={styles.headerTitle}>Now Playing</span>
        <Button
          type="text"
          icon={<List size={18} />}
          onClick={() => setShowChapters(true)}
          className={styles.listBtn}
        />
      </header>

      {/* Chapters Drawer */}
      <Drawer
        title="Chapters"
        placement="right"
        onClose={() => setShowChapters(false)}
        open={showChapters}
        className={styles.drawer}
        width={280}
      >
        <div className={styles.chapterList}>
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
        </div>
      </Drawer>

      {/* Player Main Panel */}
      <main className={styles.main}>
        {/* Album Art Cover */}
        <div className={styles.coverContainer} style={{ backgroundColor: coverColor }}>
          {book?.coverUrl ? (
            <img src={book.coverUrl} alt={book.title} className={styles.coverImage} />
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
          />
          <div className={styles.timeLabels}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Player Core Controls */}
        <div className={styles.controls}>
          <Button
            type="text"
            icon={<SkipBack size={22} />}
            onClick={() => setCurrentChapterIndex((i) => Math.max(0, i - 1))}
            disabled={currentChapterIndex === 0}
            className={styles.controlBtn}
          />
          <Button
            type="text"
            icon={<RotateCcw size={22} />}
            onClick={() => handleSkip(-15)}
            className={styles.controlBtn}
          />
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={isPlaying ? <Pause size={24} /> : <Play size={24} />}
            onClick={() => setIsPlaying(!isPlaying)}
            className={styles.playBtn}
          />
          <Button
            type="text"
            icon={<RotateCw size={22} />}
            onClick={() => handleSkip(15)}
            className={styles.controlBtn}
          />
          <Button
            type="text"
            icon={<SkipForward size={22} />}
            onClick={() => setCurrentChapterIndex((i) => Math.min(chapters.length - 1, i + 1))}
            disabled={currentChapterIndex >= chapters.length - 1}
            className={styles.controlBtn}
          />
        </div>

        {/* Volume & Speed Section */}
        <div className={styles.footerControls}>
          <div className={styles.volumeControl}>
            <Button
              type="text"
              icon={isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              onClick={() => setIsMuted(!isMuted)}
              className={styles.volumeBtn}
            />
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(v) => {
                setVolume(v);
                setIsMuted(false);
              }}
              className={styles.volumeSlider}
            />
          </div>

          <div className={styles.speedSelector}>
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`${styles.speedBtn} ${speed === s ? styles.activeSpeedBtn : ''}`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
