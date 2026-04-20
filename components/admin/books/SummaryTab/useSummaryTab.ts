import { useEffect, useState } from 'react';
import { useSnackbar } from 'notistack';
import { useBookSummary, useUpsertBookSummary } from '@/api/hooks';
import type { SummaryFormData, SummaryTabProps } from './SummaryTab.types';

const EMPTY_FORM: SummaryFormData = {
  summaryText: '',
  keyTakeaways: '',
  themes: '',
};

export const useSummaryTab = (props: SummaryTabProps) => {
  const { versionId } = props;
  const { enqueueSnackbar } = useSnackbar();

  const { data: existingSummary, isLoading } = useBookSummary(versionId);
  const upsertMutation = useUpsertBookSummary();

  // Local state for summary fields
  const [formData, setFormData] = useState<SummaryFormData>(EMPTY_FORM);

  // Hydrate form once existing summary is loaded from the server
  useEffect(() => {
    if (existingSummary) {
      setFormData({
        summaryText: existingSummary.summary ?? '',
        keyTakeaways: existingSummary.analysis ?? '',
        themes: existingSummary.themes ?? '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [existingSummary]);

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
    if (!summary) {
      enqueueSnackbar('Summary text is required', { variant: 'warning' });
      return;
    }

    const analysis = formData.keyTakeaways.trim();
    const themes = formData.themes.trim();

    upsertMutation.mutate(
      {
        versionId,
        data: {
          summary,
          analysis: analysis || undefined,
          themes: themes || undefined,
        },
      },
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
