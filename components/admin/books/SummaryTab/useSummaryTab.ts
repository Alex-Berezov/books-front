import { useEffect, useState } from 'react';
import { useSnackbar } from 'notistack';
import { useBookSummary, useUpsertBookSummary, useUpsertBookSummaryBrief } from '@/api/hooks';
import { htmlToPlainText } from '@/lib/utils/html-text';
import { readingMinutes } from '@/lib/utils/reading-time';
import { ApiError } from '@/types/api';
import type { SummaryFormData, SummaryTabProps } from './SummaryTab.types';

/**
 * Пустой редактор — без текста и без медиа. Только такой очищает поле (`null`): бриф из одной
 * картинки уходит как есть, сервер хранит его с `briefHasText = false` (решение арбитра `F04 | F04-1`).
 */
const isEmptyEditor = (html: string) =>
  htmlToPlainText(html) === '' && !/<(img|iframe|video|audio|figure)\b/i.test(html);

const EMPTY_FORM: SummaryFormData = {
  summaryText: '',
  briefText: '',
};

export const useSummaryTab = (props: SummaryTabProps) => {
  const { versionId } = props;
  const { enqueueSnackbar } = useSnackbar();

  const { data: existingSummary, status, fetchStatus, isError } = useBookSummary(versionId);
  const upsertMutation = useUpsertBookSummary();
  const briefMutation = useUpsertBookSummaryBrief();

  // Local state for summary fields
  const [formData, setFormData] = useState<SummaryFormData>(EMPTY_FORM);

  // Форма заполняется с сервера один раз на версию. Повторная подстановка после сохранения
  // (сброс кэша перечитывает пересказ) затёрла бы текст, набранный, пока шло сохранение.
  // Отказ загрузки форму не заполняет: пустое поле очень краткого ушло бы на сервер как `null`
  // и стёрло бы текст, которого редактор не видел; вкладка вместо полей показывает ошибку загрузки,
  // а заполнит форму пришедший позже ответ. Признак заполнения — состоянием: от него зависит
  // разметка (кнопка очень краткого, ошибка), а ref в рендере перерисовку не вызывает.
  // Заполняет только свежий удачный ответ (`status === 'success'` и запрос не в полёте): запрос на
  // паузе офлайн не «загружается» и не «отказал», а данных у него нет — пустая форма стёрла бы бриф;
  // а устаревший кэш при перечитывании отдал бы старый текст, и Save затёр бы чужую правку.
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  const hydrated = hydratedFor === versionId;
  useEffect(() => {
    if (status !== 'success' || fetchStatus !== 'idle' || hydratedFor === versionId) return;
    setHydratedFor(versionId);
    setFormData(
      existingSummary
        ? { summaryText: existingSummary.summary ?? '', briefText: existingSummary.brief ?? '' }
        : EMPTY_FORM
    );
  }, [existingSummary, status, fetchStatus, hydratedFor, versionId]);

  /**
   * Update form field handler
   */
  const handleFieldChange = (field: keyof SummaryFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * Summary save handler
   */
  const handleSave = () => {
    // До заполнения с сервера в поле не то, что сохранено: такая запись затёрла бы пересказ.
    if (!hydrated) return;
    const summary = formData.summaryText.trim();
    // То же правило, что у сервера (`@RichHtmlHasText`): пустой редактор отдаёт `<p></p>`.
    // Санитайзер сюда не тянется (+12 кБ в бандл админки): вырезанное им сервер отобьёт 400.
    if (!htmlToPlainText(summary)) {
      enqueueSnackbar('Summary text is required', { variant: 'warning' });
      return;
    }

    // Поля `analysis`/`themes` пересказа в форме нет (решение владельца 17.10.2026) и в анализ
    // они не идут: анализ живёт в своей записи `BookAnalysis` (F03, `tech.md` T1/T2), старые колонки
    // не удаляются (тема владельца №2). Их не шлём - сервер обновляет только переданное.
    upsertMutation.mutate(
      { versionId, data: { summary } },
      {
        onSuccess: () => {
          enqueueSnackbar('Summary saved', { variant: 'success' });
        },
        onError: (error) => {
          enqueueSnackbar(error.message || 'Failed to save summary', { variant: 'error' });
        },
      }
    );
  };

  /**
   * Очень краткий пересказ (F04) — своей кнопкой и своей ручкой. Пустой редактор очищает поле
   * (`null`): блока на странице не будет. Без полного пересказа кнопка выключена — сервер ответил бы 409.
   */
  const handleSaveBrief = () => {
    if (!hydrated || !existingSummary?.hasText) {
      enqueueSnackbar('Save the full summary first', { variant: 'warning' });
      return;
    }
    const brief = formData.briefText.trim();
    briefMutation.mutate(
      { versionId, brief: isEmptyEditor(brief) ? null : brief },
      {
        onSuccess: () => {
          enqueueSnackbar('Very short summary saved', { variant: 'success' });
        },
        onError: (error) => {
          // 5xx показывает общий тост `MutationCache`.
          if (error instanceof ApiError && error.statusCode >= 500) return;
          enqueueSnackbar(error.message || 'Failed to save the very short summary', {
            variant: 'error',
          });
        },
      }
    );
  };

  return {
    formData,
    handleFieldChange,
    handleSave,
    handleSaveBrief,
    // Очень краткий заводится после полного с текстом (`product.md` §7 п.5) — и только когда форма
    // заполнена с сервера: до этого поле пустое не потому, что текста нет.
    hasFullSummary: hydrated && Boolean(existingSummary?.hasText),
    // Пересказ не загрузился, а форма ещё не заполнялась: полей нет, сохранять нечего.
    loadFailed: isError && !hydrated,
    briefMinutes: readingMinutes(htmlToPlainText(formData.briefText)),
    // Ждём ответа, в том числе на паузе офлайн: полей нет, пока форма не заполнена.
    isLoading: !hydrated && !isError,
    isSaving: upsertMutation.isPending,
    isSavingBrief: briefMutation.isPending,
  };
};
