import { useState } from 'react';
import { useSnackbar } from 'notistack';
import type { SummaryFormData, SummaryTabProps } from './SummaryTab.types';

export const useSummaryTab = (props: SummaryTabProps) => {
  const { versionId: _versionId } = props;
  const { enqueueSnackbar } = useSnackbar();

  // Local state for summary fields
  const [formData, setFormData] = useState<SummaryFormData>({
    summaryText: '',
    keyTakeaways: '',
    themes: '',
  });

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
    // TODO (M3.2.3): Implement summary saving
    enqueueSnackbar('Summary saving not yet implemented', { variant: 'info' });
  };

  return {
    formData,
    handleFieldChange,
    handleSave,
  };
};
