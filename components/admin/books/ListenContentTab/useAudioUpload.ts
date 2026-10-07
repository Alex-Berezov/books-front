'use client';

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { uploadAudioFile } from '@/api/endpoints/admin/uploads';
import { useUploadsLimits } from '@/api/hooks';
import { mediaKeys } from '@/api/hooks/useMedia';
import { toUserMessage } from '@/lib/errors';
import { detectAudioDuration, validateUploadFile } from '@/lib/utils/audio';
import type { AudioPickerValue } from './AudioPicker.types';

interface UseAudioUploadOptions {
  onChange: (value: AudioPickerValue) => void;
  onUploadingChange?: (isUploading: boolean) => void;
}

/**
 * Upload of one audio file for `AudioPicker`: limits check, duration probe, upload with progress
 * and cancel.
 *
 * 🔴 Отмена обязательна (`LEGACY-438`): пока идёт загрузка, × и Cancel окна аудиоглавы выключены,
 * и зависшая загрузка без отмены запирала окно до перезагрузки страницы вместе с набранным текстом.
 * Отмена снимает флаг сразу, не дожидаясь ответа: прервать можно только передачу тела, а шаги
 * `presign`/`confirm` сигнала не принимают — их поздний результат отбрасывается по номеру загрузки.
 */
export const useAudioUpload = ({ onChange, onUploadingChange }: UseAudioUploadOptions) => {
  const { enqueueSnackbar } = useSnackbar();
  const { data: limits, isError: limitsFailed, refetch: refetchLimits } = useUploadsLimits();
  const queryClient = useQueryClient();

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const uploadIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);

      // 🔴 Ветка «лимитов нет» до 10.09.2026 была мертва: загрузка не работала вовсе
      // (LEGACY-372, адрес собирался в `undefined`). Теперь она живая, и пропускать файл без
      // проверки нельзя — сервер откажет уже после того, как тело уедет по сети: размер сверх
      // потолка даёт 413, чужой MIME — 415.
      //
      // Отказ и ожидание разведены намеренно: у отказавшего запроса данных нет, повторы
      // исчерпаны, и «ещё грузятся, попробуйте позже» читалось бы как «подождите» - тогда как
      // ждать нечего. На отказе повтор зовётся руками, по действию человека.
      if (!limits) {
        if (limitsFailed) {
          setError('Upload limits are unavailable — retrying, try the file again in a moment.');
          void refetchLimits();
          return;
        }
        setError('Upload limits are still loading — try again in a moment.');
        return;
      }
      const validationError = validateUploadFile(file, limits.audio);
      if (validationError) {
        setError(validationError);
        return;
      }

      // 🔴 Флаг поднимается ДО пробы длительности: она асинхронная и на большом файле
      // занимает заметное время, а весь запрет повторного броска держится на `busy`.
      // Иначе второй бросок запускает вторую загрузку: полоса прогресса скачет от двух
      // источников, первая завершившаяся снимает флаг у ещё идущей, а в форму садится та,
      // что закончила последней — с `displayName` от другого файла.
      const uploadId = ++uploadIdRef.current;
      const controller = new AbortController();
      controllerRef.current = controller;
      setIsUploading(true);
      onUploadingChange?.(true);
      setProgress(0);

      // 🔴 Проба внутри `try`: её отказ иначе обходил `finally`, и флаг загрузки оставался
      // поднятым навсегда — а с ним выключены × и Cancel окна главы (`LEGACY-438`).
      try {
        // Probe duration locally before upload — we'll use this as the
        // authoritative `duration` for the AudioChapter.
        const localDuration = await detectAudioDuration(file);
        // Отменённая во время пробы загрузка не должна запрашивать ключ у сервера.
        if (uploadIdRef.current !== uploadId) return;

        const asset = await uploadAudioFile(file, {
          onProgress: (percent) => setProgress(percent),
          signal: controller.signal,
        });

        const duration = localDuration ?? asset.duration ?? 0;
        // Загрузка создаёт `MediaAsset`, значит список медиатеки устарел — как и после
        // `useUploadMedia`. Без этого админ, открывший медиатеку в течение минуты
        // (`STALE_TIME_MS`), нового файла не увидит и загрузит его второй раз. Сброс идёт
        // и после отмены: файл, чьё тело уже ушло, сервер всё равно сохранил.
        void queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
        if (uploadIdRef.current !== uploadId) return;
        onChange({
          audioUrl: asset.url,
          mediaId: asset.id,
          duration,
          displayName: file.name,
        });
      } catch (uploadError) {
        if (uploadIdRef.current !== uploadId) return;
        const message = toUserMessage(uploadError);
        setError(message);
        enqueueSnackbar(message, { variant: 'error' });
      } finally {
        if (uploadIdRef.current === uploadId) {
          setIsUploading(false);
          onUploadingChange?.(false);
        }
      }
    },
    [enqueueSnackbar, limits, limitsFailed, refetchLimits, onChange, onUploadingChange, queryClient]
  );

  const cancelUpload = useCallback(() => {
    uploadIdRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setIsUploading(false);
    onUploadingChange?.(false);
    setProgress(0);
  }, [onUploadingChange]);

  return { limits, isUploading, progress, error, setError, setProgress, uploadFile, cancelUpload };
};
