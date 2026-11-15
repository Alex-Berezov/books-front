/**
 * Запись готового текста в буфер — «Вводные для промпта» вкладок Analysis (F03-1) и World
 * (F08-1). Текст уже собран, поэтому `writeText` зовётся сразу, в обработчике жеста; ждать
 * данные не нужно, как `copy-deferred-text.ts` (там текст приходит промисом). Вне защищённого
 * контекста (http) `navigator.clipboard` нет — отказ, а не исключение.
 */
export const copyPromptText = (text: string, onCopied: () => void, onFailed: () => void): void => {
  if (!navigator.clipboard) {
    onFailed();
    return;
  }
  navigator.clipboard.writeText(text).then(onCopied, onFailed);
};
