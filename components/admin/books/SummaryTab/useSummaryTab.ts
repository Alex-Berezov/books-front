import { useEffect, useRef, useState } from 'react';
import { useSnackbar } from 'notistack';
import { useBookSummary, useUpsertBookSummary } from '@/api/hooks';
import { htmlToPlainText } from '@/lib/utils/html-text';
import type { SummaryFormData, SummaryTabProps } from './SummaryTab.types';

const EMPTY_FORM: SummaryFormData = {
  summaryText: '',
};

export const useSummaryTab = (props: SummaryTabProps) => {
  const { versionId } = props;
  const { enqueueSnackbar } = useSnackbar();

  const { data: existingSummary, isLoading } = useBookSummary(versionId);
  const upsertMutation = useUpsertBookSummary();

  // Local state for summary fields
  const [formData, setFormData] = useState<SummaryFormData>(EMPTY_FORM);

  // Форма заполняется с сервера один раз на версию. Повторная подстановка после сохранения
  // (сброс кэша перечитывает пересказ) затёрла бы текст, набранный, пока шло сохранение.
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (isLoading || hydratedFor.current === versionId) return;
    hydratedFor.current = versionId;
    setFormData(existingSummary ? { summaryText: existingSummary.summary ?? '' } : EMPTY_FORM);
  }, [existingSummary, isLoading, versionId]);

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
    const summary = formData.summaryText.trim();
    // То же правило, что у сервера (`@RichHtmlHasText`): пустой редактор отдаёт `<p></p>`.
    // Санитайзер сюда не тянется (+12 кБ в бандл админки): вырезанное им сервер отобьёт 400.
    if (!htmlToPlainText(summary)) {
      enqueueSnackbar('Summary text is required', { variant: 'warning' });
      return;
    }

    // Поля `analysis`/`themes` в форме нет (решение владельца 17.10.2026: они - для будущего
    // раздела «Разбор и анализ»). Их не шлём - сервер обновляет только переданное, сохранённое не теряется.
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

  return {
    formData,
    handleFieldChange,
    handleSave,
    isLoading,
    isSaving: upsertMutation.isPending,
  };
};
