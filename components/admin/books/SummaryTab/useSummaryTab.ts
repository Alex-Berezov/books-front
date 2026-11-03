import { useCallback, useEffect, useRef, useState } from 'react';
import { useSnackbar } from 'notistack';
import { useBookSummary, useUpsertBookSummary, useUpsertBookSummaryBrief } from '@/api/hooks';
import { htmlToPlainText } from '@/lib/utils/html-text';
import { readingMinutes } from '@/lib/utils/reading-time';
import { ApiError } from '@/types/api';
import type { SummaryFormData, SummaryTabProps } from './SummaryTab.types';
import type { SummaryWriteField } from './SummaryWrite/summaryWrite.utils';

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

const FORM_FIELD: Record<SummaryWriteField, keyof SummaryFormData> = {
  full: 'summaryText',
  brief: 'briefText',
};

const formOf = (summary: { summary?: string | null; brief?: string | null } | null | undefined) =>
  summary ? { summaryText: summary.summary ?? '', briefText: summary.brief ?? '' } : EMPTY_FORM;

/**
 * Текст поля так, как его хранит сервер: без пробелов по краям, пустой редактор — пусто
 * (бриф уходит `null`, приходит `null`). Правка формы — отличие в этом виде, а не в пробелах.
 */
const stored = (html: string) => (isEmptyEditor(html.trim()) ? '' : html.trim());

export const useSummaryTab = (props: SummaryTabProps) => {
  const { versionId } = props;
  const { enqueueSnackbar } = useSnackbar();

  // Форма правки заполняется только свежим ответом, не кэшем другой вкладки: ход «Write Summary»
  // мог записать поле после него, и Save вернул бы прежний текст (F06-3).
  const {
    data: existingSummary,
    status,
    fetchStatus,
    isError,
    refetch,
  } = useBookSummary(versionId, { refetchOnMount: 'always' });
  const upsertMutation = useUpsertBookSummary();
  const briefMutation = useUpsertBookSummaryBrief();

  // Local state for summary fields
  const [formData, setFormData] = useState<SummaryFormData>(EMPTY_FORM);
  // Что в поле на сервере по последним сведениям формы: отличие от свежего ответа — запись хода.
  const saved = useRef<SummaryFormData>(EMPTY_FORM);
  // Текст формы в ту же точку сверки: отличие формы от него — несохранённая правка. После Save это
  // отправленный текст, а не ответ сервера: санитайзер переписывает разметку (`<br>` → `<br />`),
  // и неправленая форма иначе сочлась бы правленой (F06-3).
  const synced = useRef<SummaryFormData>(EMPTY_FORM);
  const current = useRef<SummaryFormData>(EMPTY_FORM);
  current.current = formData;
  const versionRef = useRef(versionId);
  // Сервер записал поле, а в форме несохранённая правка: текст сервера ждёт решения редактора.
  // Хранится со своей версией: вкладка переживает смену версии, текст версии A в форму B не идёт.
  const [pendingServer, setPendingServer] = useState<{
    versionId: string;
    values: Partial<SummaryFormData>;
  }>({ versionId, values: {} });
  const serverUpdates = pendingServer.versionId === versionId ? pendingServer.values : {};
  const setServerUpdates = useCallback(
    (update: (prev: Partial<SummaryFormData>) => Partial<SummaryFormData>) =>
      setPendingServer((prev) => ({
        versionId: versionRef.current,
        values: update(prev.versionId === versionRef.current ? prev.values : {}),
      })),
    []
  );
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

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
  const hydratedRef = useRef(hydrated);
  hydratedRef.current = hydrated;
  // Смена версии: сведения о сохранённом и текущем тексте прежней версии больше не годятся.
  useEffect(() => {
    if (versionRef.current === versionId) return;
    versionRef.current = versionId;
    saved.current = EMPTY_FORM;
    synced.current = EMPTY_FORM;
    current.current = EMPTY_FORM;
  }, [versionId]);
  useEffect(() => {
    if (status !== 'success' || fetchStatus !== 'idle' || hydratedFor === versionId) return;
    setHydratedFor(versionId);
    saved.current = formOf(existingSummary);
    synced.current = saved.current;
    setFormData(saved.current);
  }, [existingSummary, status, fetchStatus, hydratedFor, versionId]);

  const takeServerText = useCallback(
    (field: keyof SummaryFormData, text: string) => {
      saved.current = { ...saved.current, [field]: text };
      synced.current = { ...synced.current, [field]: text };
      setFormData((prev) => ({ ...prev, [field]: text }));
      setServerUpdates(({ [field]: _taken, ...rest }) => rest);
    },
    [setServerUpdates]
  );

  /**
   * Ход «Write Summary» записал полный или «Очень кратко» (F06-3): форма берёт из свежего ответа
   * только эти поля, иначе Save вернул бы в поле прежний текст. Поле с несохранённой правкой
   * не затирается — текст сервера ждёт «Load the server text», если сервер и правда поменял
   * поле. Перечитывание не удалось или версия сменилась — ничего не меняется и не ждёт.
   */
  const reloadFields = useCallback(
    async (fields: SummaryWriteField[]) => {
      const calledFor = versionRef.current;
      // Форма ещё не заполнена: её заполнит свежий ответ (`refetchOnMount: 'always'`).
      if (!hydratedRef.current || fields.length === 0) return;
      // Второй вызов обрывает запрос первого, а оборванный ждёт новый (query-core `fetch`, тихая
      // отмена): оба получают свежий ответ — сторож в useSummaryTabReload.test.
      const result = await refetchRef.current();
      if (result.status !== 'success' || versionRef.current !== calledFor) return;
      const server = formOf(result.data);
      for (const field of fields.map((f) => FORM_FIELD[f])) {
        // Правка сверяется в момент подстановки: набранное за время запроса тоже правка.
        if (stored(current.current[field]) === stored(synced.current[field])) {
          takeServerText(field, server[field]);
        } else if (stored(server[field]) !== stored(saved.current[field])) {
          saved.current = { ...saved.current, [field]: server[field] };
          setServerUpdates((prev) => ({ ...prev, [field]: server[field] }));
        }
      }
    },
    [setServerUpdates, takeServerText]
  );

  const loadServerText = (field: keyof SummaryFormData) => {
    const text = serverUpdates[field];
    if (text !== undefined) takeServerText(field, text);
  };

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
    const savedFor = versionId;

    // Поля `analysis`/`themes` пересказа в форме нет (решение владельца 17.10.2026) и в анализ
    // они не идут: анализ живёт в своей записи `BookAnalysis` (F03, `tech.md` T1/T2), старые колонки
    // не удаляются (тема владельца №2). Их не шлём - сервер обновляет только переданное.
    upsertMutation.mutate(
      { versionId, data: { summary } },
      {
        // Известный текст сервера — его ответ (сервер хранит без пробелов по краям), иначе
        // следующее перечитывание сочло бы поле изменённым и показало бы ложную плашку.
        onSuccess: (data) => {
          enqueueSnackbar('Summary saved', { variant: 'success' });
          // Ответ по прежней версии: сведения формы уже о другой.
          if (versionRef.current !== savedFor) return;
          saved.current = { ...saved.current, summaryText: data?.summary ?? summary };
          synced.current = { ...synced.current, summaryText: summary };
          setServerUpdates(({ summaryText: _replaced, ...rest }) => rest);
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
    const sent = isEmptyEditor(brief) ? null : brief;
    const savedFor = versionId;
    briefMutation.mutate(
      { versionId, brief: sent },
      {
        onSuccess: (data) => {
          enqueueSnackbar('Very short summary saved', { variant: 'success' });
          if (versionRef.current !== savedFor) return;
          saved.current = { ...saved.current, briefText: (data ? data.brief : sent) ?? '' };
          synced.current = { ...synced.current, briefText: sent ?? '' };
          setServerUpdates(({ briefText: _replaced, ...rest }) => rest);
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
    reloadFields,
    serverUpdates,
    loadServerText,
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
