'use client';

import { useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { setSnackbar } from '@/lib/utils/toast';

export const ToastConfigurator = () => {
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    setSnackbar(enqueueSnackbar);
  }, [enqueueSnackbar]);

  return null;
};
