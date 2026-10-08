import { useSnackbar } from 'notistack';

/** What the guard needs from a react-query list. */
interface ListState {
  isFetching: boolean;
  error: unknown;
  refetch: () => unknown;
}

const STALE_LIST_MESSAGE =
  'The chapter list is out of date and is being reloaded. Try again in a moment.';

/**
 * Lets a "new chapter" dialog open only over a fresh list (LEGACY-441, arbiter 08.10.2026):
 * the dialog takes the next number from the list. While the list is being refetched the
 * caller's button shows loading and the dialog stays closed; a failed list is retried with
 * a warning. Mutations do not wait for the refetch, so a save never hangs on it.
 *
 * @returns `canOpen()` — true when the dialog may open now
 */
export const useFreshListGuard = (list: ListState) => {
  const { enqueueSnackbar } = useSnackbar();

  return (): boolean => {
    if (list.isFetching) return false;
    if (list.error) {
      void list.refetch();
      enqueueSnackbar(STALE_LIST_MESSAGE, { variant: 'warning' });
      return false;
    }
    return true;
  };
};
