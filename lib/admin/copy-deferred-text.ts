/**
 * Запись в буфер текста, который ещё грузится. Safari разрешает запись в буфер только
 * в обработчике жеста пользователя: `writeText` после `await` запроса он отбивает. Поэтому
 * `clipboard.write` с `ClipboardItem` зовётся сразу, синхронно в обработчике, а текст
 * приходит в него промисом. Нет `ClipboardItem` или запись им не удалась — запасной путь
 * `writeText` (Chrome и Firefox пускают его и после `await`).
 *
 * Отказ самого `text` (не удалось получить данные) пробрасывается как есть — по нему
 * вызывающий отличает «не получили данные» от «не записали в буфер».
 */
export const copyDeferredText = async (text: Promise<string>): Promise<void> => {
  const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
  if (typeof ClipboardItem !== 'undefined' && typeof clipboard?.write === 'function') {
    try {
      const blob = text.then((value) => new Blob([value], { type: 'text/plain' }));
      // Отказ данных разбирается ниже через `await text`; здесь он не должен всплыть необработанным.
      blob.catch(() => undefined);
      await clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
      return;
    } catch {
      // Отказ данных — наверх; отказ записи — пробуем запасной путь ниже.
      await text;
    }
  }
  const value = await text;
  if (typeof clipboard?.writeText !== 'function') throw new Error('Clipboard is unavailable');
  await clipboard.writeText(value);
};
