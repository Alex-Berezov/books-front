'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';
import { useSession } from 'next-auth/react';
import { usePublicAudioChapters, useRecordView, useUpdateAudioProgress } from '@/api/hooks';
import { formatDuration } from '@/lib/utils/audio';
import styles from './AudioPlayer.module.scss';

/** Minimum gap between progress PUTs while playing, in ms. */
const PROGRESS_SAVE_THROTTLE_MS = 5000;

export interface AudioPlayerProps {
  versionId: string;
}

export const AudioPlayer: FC<AudioPlayerProps> = ({ versionId }) => {
  const { data, error, isLoading } = usePublicAudioChapters(versionId);
  const chapters = useMemo(() => data?.items ?? [], [data?.items]);

  const { status: authStatus } = useSession();
  const isAuthenticated = authStatus === 'authenticated';

  const recordViewMutation = useRecordView();
  const updateProgressMutation = useUpdateAudioProgress(versionId);

  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Select first chapter once loaded.
  useEffect(() => {
    if (!activeChapterId && chapters.length > 0) {
      setActiveChapterId(chapters[0].id);
    }
  }, [activeChapterId, chapters]);

  const activeChapter = useMemo(
    () => chapters.find((c) => c.id === activeChapterId) ?? null,
    [chapters, activeChapterId]
  );

  // Throttled progress save — only while authenticated.
  const lastSaveRef = useRef(0);
  const hasRecordedViewRef = useRef(false);

  const handleTimeUpdate = useCallback(() => {
    if (!isAuthenticated || !activeChapter) return;
    const audio = audioRef.current;
    if (!audio) return;

    const now = Date.now();
    if (now - lastSaveRef.current < PROGRESS_SAVE_THROTTLE_MS) return;
    lastSaveRef.current = now;

    updateProgressMutation.mutate({
      audioChapterNumber: activeChapter.number,
      position: Math.max(0, Math.floor(audio.currentTime)),
    });
  }, [activeChapter, isAuthenticated, updateProgressMutation]);

  const handlePlay = useCallback(() => {
    if (hasRecordedViewRef.current) return;
    hasRecordedViewRef.current = true;
    recordViewMutation.mutate({ versionId, source: 'audio' });
  }, [recordViewMutation, versionId]);

  // Reset per-chapter state when switching.
  useEffect(() => {
    lastSaveRef.current = 0;
  }, [activeChapterId]);

  // Flush final progress on unmount / visibility hide.
  useEffect(() => {
    if (!isAuthenticated) return;
    const flush = () => {
      const audio = audioRef.current;
      if (!audio || !activeChapter) return;
      updateProgressMutation.mutate({
        audioChapterNumber: activeChapter.number,
        position: Math.max(0, Math.floor(audio.currentTime)),
      });
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      flush();
    };
  }, [activeChapter, isAuthenticated, updateProgressMutation]);

  if (isLoading) {
    return <div className={styles.loading}>Loading audio chapters…</div>;
  }
  if (error) {
    return (
      <div className={styles.error}>
        Failed to load audio chapters. The version may not be published yet.
      </div>
    );
  }
  if (chapters.length === 0) {
    return <div className={styles.empty}>This audio book has no chapters yet.</div>;
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>Chapters</h2>
        <ul className={styles.chapterList}>
          {chapters.map((chapter) => {
            const isActive = chapter.id === activeChapterId;
            return (
              <li key={chapter.id}>
                <button
                  type="button"
                  className={`${styles.chapterItem} ${isActive ? styles.active : ''}`}
                  onClick={() => setActiveChapterId(chapter.id)}
                >
                  <span className={styles.chapterNumber}>{chapter.number}.</span>
                  <span className={styles.chapterTitle}>{chapter.title}</span>
                  <span className={styles.chapterDuration}>{formatDuration(chapter.duration)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className={styles.main}>
        {activeChapter ? (
          <div className={styles.nowPlaying}>
            <p className={styles.nowPlayingLabel}>Now playing</p>
            <h1 className={styles.nowPlayingTitle}>
              {activeChapter.number}. {activeChapter.title}
            </h1>
            <audio
              ref={audioRef}
              key={activeChapter.id}
              className={styles.audio}
              controls
              preload="metadata"
              src={activeChapter.audioUrl}
              onPlay={handlePlay}
              onTimeUpdate={handleTimeUpdate}
            >
              Your browser does not support the audio element.
            </audio>
            {activeChapter.description && (
              <div className={styles.description}>{activeChapter.description}</div>
            )}
          </div>
        ) : (
          <div className={styles.empty}>Select a chapter to start listening.</div>
        )}
      </section>
    </div>
  );
};
