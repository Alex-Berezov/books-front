import { type EnqueueSnackbar, type OptionsObject } from 'notistack';

let enqueueSnackbarRef: EnqueueSnackbar | null = null;

export const setSnackbar = (fn: EnqueueSnackbar) => {
  enqueueSnackbarRef = fn;
};

export const toast = {
  success: (message: string, options?: OptionsObject) => {
    enqueueSnackbarRef?.(message, { variant: 'success', ...options });
  },
  error: (message: string, options?: OptionsObject) => {
    enqueueSnackbarRef?.(message, { variant: 'error', ...options });
  },
  warning: (message: string, options?: OptionsObject) => {
    enqueueSnackbarRef?.(message, { variant: 'warning', ...options });
  },
  info: (message: string, options?: OptionsObject) => {
    enqueueSnackbarRef?.(message, { variant: 'info', ...options });
  },
};
