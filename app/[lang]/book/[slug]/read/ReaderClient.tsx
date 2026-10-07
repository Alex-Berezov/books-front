'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useUpdateTextProgress } from '@/api/hooks/useProgress';
import { useReaderBootstrap } from '@/api/hooks/usePublic';
import { ReaderView, useImmersiveBody } from '@/components/common/ReaderView';
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
import type { ReaderBootstrapChapter } from '@/types/api-schema';
import styles from './reader.module.scss';

type Props = {
  params: { lang: string; slug: string };
  // Есть ли у книги текстовая версия. Знает это серверный `page.tsx` — он и так
  // читает обзор книги, чтобы отдать честный 404 (LEGACY-084), — а `reader-bootstrap`
  // на такой книге отвечает 404 и от настоящего отказа неотличим.
  hasTextVersion?: boolean;
};

export default function ReaderClient({ params, hasTextVersion }: Props) {
  const { lang, slug } = params;
  const supportedLang = lang as SupportedLang;
  const router = useRouter();
  const goBack = useSmartBack(`/${lang}/book/${slug}`);
  const { t } = useTranslation();
  const { data: session } = useSession();
  const userId = session?.user ? (session.user as { id?: string }).id || undefined : undefined;

  const { data: bootstrapData, isLoading, error } = useReaderBootstrap(supportedLang, slug, userId);

  const chapters = useMemo(() => bootstrapData?.chapters || [], [bootstrapData]);
  const versionId = bootstrapData?.versionId || '';

  // The reader owns the viewport: the public chrome is hidden (LayoutChrome) and the page
  // scroll is locked so only the chapter text scrolls — no second scrollbar hiding the bars.
  const isImmersive = !isRightsBlockedError(error);

  useImmersiveBody(isImmersive);

  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [hasRestoredProgress, setHasRestoredProgress] = useState(false);

  const { target: progressTarget, userId: progressOwnerId } = useProgressIdentity();
  const { isSettled } = useProgressSync();

  /**
   * Читатель уже сам выбрал, где находится.
   *
   * 🔴 У вошедшего `isSettled` приходит после слияния, а это до двадцати
   * последовательных запросов. За эти секунды человек успевает перелистнуть
   * главу или выбрать её в оглавлении — и восстановление увело бы его с той
   * страницы, которую он только что открыл руками.
   */
  const hasUserNavigatedRef = useRef(false);

  /**
   * Глава, которая уже записана в хранилище или на сервере.
   *
   * 🔴 Защита от обратной записи того, что только что прочитано. Сценарий:
   * слияние упало на сети, читалка восстановила серверную 5-ю главу, а через три
   * секунды отложенное сохранение шлёт её же обратно. Серверный `updatedAt`
   * становится свежее локального, и следующее слияние считает несведённую 12-ю
   * главу устаревшей и удаляет её. Место читателя не просто не показано — оно стёрто.
   * Заодно уходит бесполезный `PUT` при каждом открытии книги.
   */
  const persistedChapterRef = useRef<number | null>(null);

  /**
   * Восстановление позиции — ровно один раз за открытие книги.
   *
   * 🔴 Ждём `isSettled`. Пока идёт слияние локального прогресса с серверным,
   * `lastProgress` в бутстрапе — значение, снятое до слияния; восстановиться по
   * нему значит показать не ту главу и через три секунды записать её на сервер
   * поверх правильной.
   *
   * 🔴 `hasRestoredProgress` выставляется во всех исходах, а не только когда
   * прогресс нашёлся: этот же признак разрешает сохранение (см. `saveProgress`),
   * и книга без прогресса иначе никогда бы его не начала копить.
   *
   * 🔴 У вошедшего локальная запись — запасной источник, а не мусор. Слияние
   * могло не пройти (сеть, закрытая на середине очереди вкладка), и тогда на
   * сервере пусто, а место в книге цело только здесь. Открыть такую книгу с
   * первой главы — значит через три секунды закрепить её на сервере и потерять
   * локальную при следующем слиянии.
   */
  useEffect(() => {
    if (hasRestoredProgress || !isSettled || chapters.length === 0 || !versionId) return;

    if (hasUserNavigatedRef.current) {
      setHasRestoredProgress(true);
      return;
    }

    const serverChapterNumber =
      progressTarget === 'server' ? (bootstrapData?.lastProgress?.chapterNumber ?? null) : null;
    // 🔴 Запасной источник фильтруется по владельцу тем же правилом, что
    // и слияние. Без этого на общем компьютере вошедший попадает на главу чужого
    // читателя и через три секунды записывает её в свой аккаунт.
    const chapterNumber =
      serverChapterNumber ??
      readLocalProgress(versionId, progressOwnerId)?.text?.chapterNumber ??
      null;

    if (chapterNumber !== null) {
      const idx = chapters.findIndex((c) => c.number === chapterNumber);
      if (idx !== -1) {
        setCurrentChapterIndex(idx);
        persistedChapterRef.current = chapterNumber;
      }
    }

    setHasRestoredProgress(true);
  }, [
    chapters,
    versionId,
    bootstrapData,
    hasRestoredProgress,
    isSettled,
    progressTarget,
    progressOwnerId,
  ]);

  /**
   * Канонизация слага на клиенте — вторая половина серверной, а не её дубль.
   *
   * 🔴 Страница проверяет слаг по `getBookOverview` (`revalidate: 300`), а этот
   * компонент читает `reader-bootstrap` (`cache: 'no-store'`). В окне ISR сервер
   * ещё видит старый слаг и потому не редиректит, а свежий бутстрап уже отдаёт
   * новый — без этого эффекта читалка до пяти минут висела бы на устаревшем
   * адресе. У плеера и саммари такого зазора нет: им тот же серверный ответ
   * уезжает в `initialData`, и второго источника правды не появляется.
   */
  useEffect(() => {
    if (bootstrapData && bootstrapData.slug && bootstrapData.slug !== slug) {
      router.replace(`/${lang}/book/${bootstrapData.slug}/read`);
    }
  }, [bootstrapData, slug, lang, router]);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentChapter = chapters[currentChapterIndex];

  const updateProgressMutation = useUpdateTextProgress(versionId);

  /**
   * 🔴 Сохранение закрыто до восстановления (`hasRestoredProgress`). Эффект
   * ниже дёргает отложенное сохранение сразу при монтировании, и без этого
   * условия открытие книги записывало бы первую главу поверх сохранённой
   * двенадцатой — читатель терял бы место ровно тем действием, которым его
   * пытался занять.
   *
   * Состояние `'unknown'` (сессия ещё грузится) не пишет никуда: положить главу
   * в `localStorage` за вошедшего значит подсунуть слиянию заведомо свежую
   * запись и откатить его назад по книге.
   */
  const saveProgress = useCallback(
    (chapter: ReaderBootstrapChapter) => {
      if (!versionId || !hasRestoredProgress) return;
      // Глава уже записана — см. `persistedChapterRef`.
      if (persistedChapterRef.current === chapter.number) return;

      persistedChapterRef.current = chapter.number;

      if (progressTarget === 'server') {
        updateProgressMutation.mutate({
          chapterNumber: chapter.number,
          position: 0,
        });
        return;
      }

      if (progressTarget === 'local') {
        saveLocalProgress({
          versionId,
          ownerId: progressOwnerId,
          kind: 'text',
          chapterNumber: chapter.number,
          // Читалка не отслеживает место внутри главы, и серверу шлёт тот же ноль.
          position: 0,
        });
      }
    },
    [updateProgressMutation, versionId, progressTarget, progressOwnerId, hasRestoredProgress]
  );

  const saveProgressRef = useRef(saveProgress);
  useEffect(() => {
    saveProgressRef.current = saveProgress;
  }, [saveProgress]);

  const debouncedSave = useCallback((chapter: ReaderBootstrapChapter) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveProgressRef.current(chapter);
    }, 3000);
  }, []);

  /**
   * 🔴 `hasRestoredProgress` в зависимостях обязателен. Эффект срабатывает при
   * монтировании, когда сохранение ещё закрыто; если слияние затянется дольше
   * трёх секунд, а глава после восстановления окажется той же самой, без
   * этой зависимости эффект больше не перезапустится и час чтения не запишется
   * никуда.
   */
  useEffect(() => {
    if (currentChapter && hasRestoredProgress) {
      debouncedSave(currentChapter);
    }
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [currentChapterIndex, currentChapter, debouncedSave, hasRestoredProgress]);

  const goToChapter = (index: number) => {
    hasUserNavigatedRef.current = true;
    setCurrentChapterIndex(index);
  };

  // Rights blocking arrives as 451 from the reader-bootstrap request. The reader is never rendered
  // in that case — the visitor gets the explanation instead of a generic loading failure (ADR-012).
  if (isRightsBlockedError(error)) {
    return <RightsBlockedNotice lang={lang} bookSlug={slug} />;
  }

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

  // Отказ загрузки, не являющийся правовой блокировкой (404 на опечатку в слаге,
  // 500 от `reader-bootstrap`), не должен доезжать до ветки пустой книги ниже:
  // для неё оба случая выглядят как `chapters.length === 0`, и читатель не может
  // отличить сломанную загрузку от честно пустой книги (`LEGACY-268`).
  //
  // 🔴 Условие смотрит и на данные. React Query при отказе **пере**запроса
  // сохраняет прежний `data` и одновременно ставит `error`, а перезапрос здесь
  // штатный: `refetchOnReconnect` включён, и `useUpdateTextProgress`
  // обесценивает `readerBootstrap` после каждого сохранения. Голое `if (error)`
  // выбрасывало бы читателя из открытой книги на экран отказа при живом тексте
  // в руках.
  // 🔴 …но у книги без текстовой версии отказ бутстрапа — это ответ, а не поломка.
  // `reader-bootstrap` отдаёт на неё 404, а страница уже поручилась, что книга
  // существует (LEGACY-084), поэтому единственное, чего тут нет, — текста. До
  // разведения этих двух случаев открытая аудиокнига по адресу `/read` показывала
  // «не удалось загрузить, попробуйте позже» — поломку там, где ничего не
  // сломано, — а мягкое `reader.noChapters` было недостижимо вовсе. У плеера тот
  // же случай разведён с самого начала (`player.noChapters` против `chaptersFail`).
  if (error && chapters.length === 0 && hasTextVersion !== false) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorText}>{t('reader.loadError')}</p>
        <button type="button" onClick={goBack} className={styles.secondaryBtn}>
          {t('book.back')}
        </button>
      </div>
    );
  }

  return (
    <ReaderView
      title={bootstrapData?.title}
      chapters={chapters}
      currentChapterIndex={currentChapterIndex}
      onChapterChange={goToChapter}
      onBack={goBack}
    />
  );
}
