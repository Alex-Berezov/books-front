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
import { useProgress } from '@/api/hooks/useProgress';
import { useBookOverview } from '@/api/hooks/usePublic';
import {
  usePublicAudioChapters,
  useRecordView,
  useUpdateAudioProgress,
} from '@/api/hooks/usePublicAudio';
import { RightsBlockedNotice } from '@/components/common/RightsBlockedNotice';
import { useSmartBack } from '@/components/public/navigation';
import { isRightsBlockedError } from '@/lib/errors';
import { useTranslation } from '@/lib/i18n/useTranslation';
import {
  readLocalProgress,
  saveLocalProgress,
  useProgressIdentity,
  useProgressSync,
} from '@/lib/reading-progress';
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
  const goBack = useSmartBack(`/${lang}/book/${slug}`);
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
  const [hasRestoredProgress, setHasRestoredProgress] = useState(false);
  /**
   * Счётчик запрошенных перемоток. Нужен, чтобы эффект загрузки дорожки
   * перезапустился даже тогда, когда восстановленная глава совпала с текущей.
   */
  const [seekEpoch, setSeekEpoch] = useState(0);
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
  /**
   * Куда перемотать и на какой именно главе.
   *
   * 🔴 Номер главы хранится вместе с позицией намеренно. Перемотка
   * применяется только к той дорожке, для которой была считана.
   */
  const pendingSeekRef = useRef<{ chapterIndex: number; position: number } | null>(null);
  /**
   * Слушатель уже сам выбрал место.
   *
   * 🔴 У вошедшего `isSettled` приходит после слияния, а это до двадцати
   * последовательных запросов. За эти секунды человек успевает нажать play или
   * выбрать главу — уводить его после этого нельзя.
   */
  const hasUserNavigatedRef = useRef(false);

  const currentChapter = chapters[currentChapterIndex];

  const recordViewMutation = useRecordView();
  const updateProgressMutation = useUpdateAudioProgress(versionId);

  const { target: progressTarget, userId: progressOwnerId } = useProgressIdentity();
  const { isSettled } = useProgressSync();

  /**
   * Серверная позиция для плеера. У читалки она приезжает в `reader-bootstrap`,
   * у аудио такого бутстрапа нет — берём отдельным запросом.
   *
   * 🔴 Своего `retry` здесь нет намеренно. Отказ этого запроса закрывает
   * сохранение на весь визит, а `refetchOnWindowFocus` выключен — с `retry: false`
   * одного случайного 503 хватало, чтобы час прослушивания не записался никуда
   * и без единого признака на экране. Общий `shouldRetry` даёт три попытки на 5xx
   * и ни одной на 4xx; «прогресса ещё нет» приходит пустым телом и ошибкой
   * не является вовсе.
   */
  const {
    data: serverProgress,
    isLoading: isServerProgressLoading,
    isError: isServerProgressError,
  } = useProgress(versionId, progressOwnerId ?? undefined, {
    enabled: progressTarget === 'server' && !!versionId,
  });

  /**
   * Восстановление главы и секунды — один раз за открытие книги, для всех
   * одинаково: вошедшему из серверной записи, остальным из `localStorage`.
   *
   * 🔴 Отказ запроса не равен «прогресса нет». На 503 мы не знаем места
   * читателя — и потому не только не восстанавливаем, но и не открываем
   * сохранение: иначе через пять секунд прослушивания с первой главы
   * throttle запишет её поверх настоящей двадцатой.
   */
  useEffect(() => {
    if (hasRestoredProgress || !isSettled || chapters.length === 0 || !versionId) return;
    if (progressTarget === 'unknown') return;
    if (progressTarget === 'server' && (isServerProgressLoading || isServerProgressError)) return;

    if (hasUserNavigatedRef.current) {
      setHasRestoredProgress(true);
      return;
    }

    const fromServer =
      progressTarget === 'server' && serverProgress?.audioChapterNumber
        ? { chapterNumber: serverProgress.audioChapterNumber, position: serverProgress.position }
        : null;
    // Слияние могло не пройти — тогда место в книге цело только локально.
    const stored = fromServer ?? readLocalProgress(versionId, progressOwnerId)?.audio ?? null;

    if (stored) {
      const idx = chapters.findIndex((c) => c.number === stored.chapterNumber);
      if (idx !== -1) {
        setCurrentChapterIndex(idx);
        if (stored.position > 0) {
          pendingSeekRef.current = { chapterIndex: idx, position: stored.position };
          setSeekEpoch((epoch) => epoch + 1);
        }
      }
    }

    setHasRestoredProgress(true);
  }, [
    hasRestoredProgress,
    isSettled,
    chapters,
    versionId,
    progressTarget,
    progressOwnerId,
    serverProgress,
    isServerProgressLoading,
    isServerProgressError,
  ]);

  /**
   * Индекс главы всегда внутри списка.
   *
   * 🔴 Список укорачивается под открытым плеером: `refetchOnReconnect` тянет
   * `usePublicAudioChapters` заново после восстановления связи, а переход между двумя
   * книгами переиспользует тот же экземпляр компонента вместе с его состоянием.
   * Индекс за концом списка даёт `currentChapter === undefined`: заголовок пропадает,
   * дорожка не меняется, сохранение молча прекращается, а выбраться можно только
   * через список глав.
   */
  useEffect(() => {
    if (chapters.length > 0 && currentChapterIndex >= chapters.length) {
      setCurrentChapterIndex(chapters.length - 1);
    }
  }, [chapters.length, currentChapterIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const now = Date.now();
      // 🔴 Пока позиция не восстановлена, не сохраняем: throttle сработал бы на
      // первых же секундах воспроизведения с нуля и затёр бы сохранённое место.
      if (
        hasRestoredProgress &&
        progressTarget !== 'unknown' &&
        now - lastSaveRef.current >= PROGRESS_SAVE_THROTTLE_MS &&
        currentChapter
      ) {
        lastSaveRef.current = now;
        const position = Math.max(0, Math.floor(audio.currentTime));

        if (progressTarget === 'server') {
          updateProgressMutation.mutate({
            audioChapterNumber: currentChapter.number,
            position,
          });
        } else {
          saveLocalProgress({
            versionId,
            ownerId: progressOwnerId,
            kind: 'audio',
            chapterNumber: currentChapter.number,
            position,
          });
        }
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
  }, [
    currentChapterIndex,
    chapters.length,
    currentChapter,
    updateProgressMutation,
    progressTarget,
    progressOwnerId,
    hasRestoredProgress,
    versionId,
  ]);

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

  /**
   * Загрузка дорожки и перемотка на восстановленную позицию — одним эффектом.
   *
   * 🔴 Развести их нельзя. Отдельный эффект перемотки выполнился бы
   * раньше смены `src` — и при уже загруженных метаданных первой главы
   * (`preload="metadata"` успевает за время слияния) перемотал бы **её**, а не
   * целевую: сохранённая 5-я глава на 12:30 открывалась бы с нуля, а через пять
   * секунд этот ноль уехал бы на сервер поверх настоящей позиции.
   *
   * 🔴 Сама перемотка ждёт `loadedmetadata`: присвоение `currentTime` до
   * загрузки метаданных браузер молча игнорирует.
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentChapter?.audioUrl) return;

    audio.src = currentChapter.audioUrl;
    audio.load();
    setCurrentTime(0);
    lastSaveRef.current = 0;

    const pending = pendingSeekRef.current;
    let detachSeek: (() => void) | undefined;

    if (pending !== null && pending.chapterIndex === currentChapterIndex) {
      const applySeek = () => {
        // Дорожку могли перезалить короче — не уводим ползунок за её конец.
        const limit = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null;
        const target = limit === null ? pending.position : Math.min(pending.position, limit);
        audio.currentTime = target;
        setCurrentTime(target);
        pendingSeekRef.current = null;
      };

      audio.addEventListener('loadedmetadata', applySeek, { once: true });
      detachSeek = () => audio.removeEventListener('loadedmetadata', applySeek);
    }

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }

    return detachSeek;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChapterIndex, currentChapter?.audioUrl, seekEpoch]);

  /**
   * Любое действие слушателя отменяет отложенное восстановление: он уже выбрал
   * место сам, и переставлять его посреди прослушивания нельзя.
   */
  const markUserNavigated = () => {
    hasUserNavigatedRef.current = true;
    pendingSeekRef.current = null;
  };

  const goToChapter = (index: number) => {
    markUserNavigated();
    setCurrentChapterIndex(index);
  };

  const togglePlay = () => {
    markUserNavigated();
    setIsPlaying((playing) => !playing);
  };

  const handleSeek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    markUserNavigated();
    audio.currentTime = value;
    setCurrentTime(value);
  };

  const handleSkip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    markUserNavigated();
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

  // Rights blocking arrives as 451 from the audio-chapters request and must be told apart from a
  // generic loading failure: the player is not broken, the market is closed (ADR-012).
  if (isRightsBlockedError(error)) {
    return <RightsBlockedNotice lang={lang} bookSlug={slug} />;
  }

  if (error || chapters.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorText}>
          {chapters.length === 0 ? t('player.noChapters') : t('player.chaptersFail')}
        </p>
        <button type="button" onClick={goBack} className={styles.secondaryBtn}>
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
          onClick={goBack}
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
                aria-label={t('a11y.close')}
              >
                <X size={18} />
              </button>
            </div>
            <nav className={styles.chapterList} aria-label={t('player.chapters')}>
              {chapters.map((ch, idx) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    goToChapter(idx);
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
            onClick={() => goToChapter(Math.max(0, currentChapterIndex - 1))}
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
            onClick={togglePlay}
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
            onClick={() => goToChapter(Math.min(chapters.length - 1, currentChapterIndex + 1))}
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
