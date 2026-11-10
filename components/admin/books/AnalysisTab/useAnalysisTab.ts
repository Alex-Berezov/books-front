import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSnackbar } from 'notistack';
import {
  isRegenRunning,
  useAnalysisWrite,
  useAnalysisWritesInFlight,
  useBookAnalysis,
  useBookVersion,
  useChapterTitles,
  useSaveBookAnalysis,
  useVersionDossier,
} from '@/api/hooks';
import {
  analysisRequestFromForm,
  blockText,
  formFromAnalysis,
  hasDraftIssues,
  mergeAnalysisImport,
  takeServerBlocks,
  UNCHECKED_DRAFT_ISSUE,
  type BookAnalysisFormValues,
} from '@/lib/admin/book-analysis-form-state';
import {
  buildAnalysisPromptInputsText,
  promptMotifsFromDossier,
} from '@/lib/admin/book-analysis-prompt-inputs';
import { expectedRowOf, isRecordChanged } from '@/lib/admin/expected-row';
import {
  loadBookAnalysisValidation,
  type BookAnalysisValidation,
} from '@/lib/admin/load-book-analysis-validation';
import { refetchFresh } from '@/lib/admin/refetch-fresh';
import { ApiError } from '@/types/api';
import type { AnalysisPreview, AnalysisServerCheck, AnalysisTabProps } from './AnalysisTab.types';
import type {
  BookAnalysisFactKey,
  BookAnalysisListKey,
  BookAnalysisTextKey,
} from '@/lib/admin/book-analysis-blocks';
import type { ExpectedRow, SaveBookAnalysisRequest } from '@/types/api-schema';

/**
 * Текст отказа: сервер отдаёт ошибки проверки массивом «путь: причина» — по строке на ошибку,
 * а не одной строкой через запятую, как его склеивает `ApiError`.
 */
const errorText = (error: unknown): string => {
  if (error instanceof ApiError) {
    const raw = (error.data as { message?: unknown } | undefined)?.message;
    if (Array.isArray(raw)) return raw.map(String).join('\n');
  }
  return error instanceof Error ? error.message : 'Check failed';
};

/** 5xx уже показал глобальный тост (`providers/AppProviders.tsx`), второй не нужен. */
const isServerFailure = (error: unknown) => error instanceof ApiError && error.statusCode >= 500;

export const useAnalysisTab = (props: AnalysisTabProps) => {
  const { versionId, version, isAdmin = false } = props;
  const { enqueueSnackbar } = useSnackbar();

  const analysisQuery = useBookAnalysis(versionId);
  const chaptersQuery = useChapterTitles(versionId);
  // Мотивы во «Вводные» — из досье версии (решение арбитра `F07 | F07-3`): только у `admin`,
  // ручка досье закрыта остальным.
  const dossierQuery = useVersionDossier(versionId, isAdmin);
  // Ход «Write Analysis» — тот же запрос, что у блока хода (общий ключ, второго GET нет): пока он
  // идёт, «Save analysis» закрыт — полная запись формы (А4) затёрла бы записанное ходом
  // (решение арбитра `F07 | F07-3`, круг 3, Б1). Состояние хода не пришло или не загрузилось —
  // идёт ли запись, неизвестно, и сохранение стоит так же.
  const runQuery = useAnalysisWrite(versionId, isAdmin);
  const runUnknown = isAdmin && runQuery.data === undefined;
  const run = runQuery.data?.draft ?? null;
  const runWriting = run?.status === 'building' && run.operation.status !== 'paused';
  // Перегенерация пустого блока пишет его в анализ сразу (а заполненного — предложением): пока
  // идёт любая, запись возможна.
  const runRegenerating = run?.items.some(isRegenRunning) ?? false;
  // «Accept», «Accept all» и запуск «Regenerate» в полёте: ответ вот-вот запишет блоки.
  const writesInFlight = useAnalysisWritesInFlight(versionId);
  // Досье переведённой версии — досье её исходника: язык досье — язык той версии.
  const dossierSource = dossierQuery.data?.sourceVersionId ?? null;
  const foreignDossier = dossierSource !== null && dossierSource !== versionId;
  const dossierSourceQuery = useBookVersion(dossierSource ?? '', {
    enabled: isAdmin && foreignDossier,
  });
  const saveMutation = useSaveBookAnalysis();
  // Отдельная мутация для пробы: её ожидание не должно выглядеть сохранением.
  const { mutateAsync: runPreview, isPending: savedCheckPending } = useSaveBookAnalysis();
  // Своя мутация: превью импорта не должно выглядеть пробой ядра на плашке.
  const { mutateAsync: runImportPreview } = useSaveBookAnalysis();

  const [form, setForm] = useState<BookAnalysisFormValues>(() => formFromAnalysis(null));
  const [validation, setValidation] = useState<BookAnalysisValidation | null>(null);
  const [validationFailed, setValidationFailed] = useState(false);
  /** Итог последнего сохранения: виден, пока редактор не сохранит снова (§21 п.3). */
  const [lastCheck, setLastCheck] = useState<AnalysisServerCheck | null>(null);
  /** Проба сохранённого анализа без ядра не удалась: показать причину и повтор, а не «проверяем…». */
  const [savedCheckError, setSavedCheckError] = useState<string | null>(null);
  // Номер итога: ответ пробы при открытии не перетирает итог сохранения, пришедший раньше него.
  const checkSeq = useRef(0);

  const loadValidation = useCallback(() => {
    setValidationFailed(false);
    loadBookAnalysisValidation().then(setValidation, () => setValidationFailed(true));
  }, []);
  useEffect(loadValidation, [loadValidation]);

  // Правки списков, сделанные до загрузки проверки, проверяются, как только она пришла.
  useEffect(() => {
    if (validation) setForm((prev) => validation.revalidateListDrafts(prev));
  }, [validation]);

  const checkSaved = (values: BookAnalysisFormValues) => {
    const seq = ++checkSeq.current;
    setSavedCheckError(null);
    runPreview({
      versionId,
      data: analysisRequestFromForm(values, version.language),
      dryRun: true,
    }).then(
      (res) => {
        if (seq === checkSeq.current)
          setLastCheck({ hasCore: res.hasCore, warnings: res.warnings });
      },
      (error: unknown) => {
        if (seq === checkSeq.current) {
          setSavedCheckError(error instanceof Error ? error.message : 'Check failed');
        }
      }
    );
  };

  // Форма заполняется с сервера один раз на версию и только из успешного ответа: при ошибке
  // чтения пустая форма, отправленная целиком (А4), стёрла бы живой анализ. Перечитывание после
  // сохранения не должно затирать набранное, пока шло сохранение (как у пересказа).
  const hydratedFor = useRef<string | null>(null);
  // Снимок формы сохранённой записи: база слияния при перечитывании (проба ядра берёт живую запись).
  const savedForm = useRef<BookAnalysisFormValues | null>(null);
  // С чем форма сверена (`LEGACY-496`): кэш запроса уходит вперёд без формы — на сохранение идёт это.
  const formBase = useRef<ExpectedRow | undefined>(undefined);
  // Текст сервера по блокам с несохранённой правкой (решение арбитра `T173 | LEGACY-496`).
  const [serverBlocks, setServerBlocks] = useState<Record<string, string>>({});
  // Форма на этом рендере: перечитывание после записи хода сверяет правки с ней в момент подстановки.
  const currentForm = useRef(form);
  currentForm.current = form;
  useEffect(() => {
    // Пока идёт перечитывание, кэш может быть устаревшим (вкладку смонтировали заново позже
    // `staleTime`): заполнять форму только свежими данными, иначе сохранение всей записи вернёт
    // блоки, сохранённые другим редактором. Перечитывание на паузе офлайн (`fetchStatus: 'paused'`)
    // не «в полёте» по `isFetching`, но кэш у него тот же устаревший — ждём `idle`, как пересказ.
    if (
      !analysisQuery.isSuccess ||
      analysisQuery.fetchStatus !== 'idle' ||
      hydratedFor.current === versionId
    ) {
      return;
    }
    hydratedFor.current = versionId;
    // Проба прошлой версии (тот же хук при смене версии) не должна лечь на эту.
    checkSeq.current += 1;
    setSavedCheckError(null);
    const saved = analysisQuery.data ?? null;
    const hydrated = formFromAnalysis(saved);
    savedForm.current = hydrated;
    formBase.current = expectedRowOf(saved);
    setServerBlocks({});
    setForm(hydrated);
    setLastCheck(null);
    // Сохранённый анализ без ядра: сразу показать, чего не хватает (§2), — той же пробой сервера.
    if (saved && !saved.hasCore) checkSaved(hydrated);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- гидрация один раз на версию; checkSaved читает только аргумент и стабильные ссылки
  }, [analysisQuery.data, analysisQuery.isSuccess, analysisQuery.fetchStatus, versionId]);

  // Форма заполнена с сервера для этой версии. Гидрация ставит ref и сразу `setForm` — рендер
  // после неё читает свежее значение.
  const formHydrated = hydratedFor.current === versionId;
  // Ход записал блоки, а перечитать анализ не удалось: форма держит прежние блоки, и «Save
  // analysis» (полная запись, А4) затёрла бы записанное ходом. Сохранение стоит до свежего ответа.
  const [staleFor, setStaleFor] = useState<string | null>(null);
  const formStale = staleFor === versionId;
  // Идёт перечитывание после записи хода: форма вот-вот получит записанное, сохранять рано.
  const [reloading, setReloading] = useState(false);
  /** Почему «Save analysis» закрыт сейчас; `null` — открыт. */
  const saveBlockedReason = runUnknown
    ? runQuery.isError
      ? 'Could not load the analysis run: reload the page before saving.'
      : 'The analysis run is loading: save when it loads.'
    : runWriting
      ? 'The analysis run is writing blocks: save when it ends or pauses.'
      : runRegenerating
        ? 'A block of the analysis run is being regenerated: save when it ends.'
        : writesInFlight
          ? 'Blocks of the analysis run are being written: save when it ends.'
          : reloading
            ? 'The analysis is being reloaded from the server: save when it ends.'
            : null;

  const setFact = (key: BookAnalysisFactKey, value: string) =>
    setForm((prev) => ({ ...prev, facts: { ...prev.facts, [key]: value } }));

  const setText = (key: BookAnalysisTextKey, value: string) =>
    setForm((prev) => ({ ...prev, texts: { ...prev.texts, [key]: value } }));

  const setListText = (key: BookAnalysisListKey, text: string) => {
    if (!validation) {
      // Пока проверка не загружена, текст не проверен: сохранение стоит, значение — прежнее.
      setForm((prev) => ({
        ...prev,
        drafts: {
          ...prev.drafts,
          [key]: { text, issues: [{ path: key, message: UNCHECKED_DRAFT_ISSUE }] },
        },
      }));
      return;
    }
    const result = validation.applyListText(key, text);
    setForm((prev) =>
      result.issues
        ? { ...prev, drafts: { ...prev.drafts, [key]: { text, issues: result.issues } } }
        : {
            ...prev,
            lists: { ...prev.lists, [key]: result.value },
            drafts: { ...prev.drafts, [key]: { text, issues: null } },
          }
    );
  };

  const analyzeImport = useMemo(
    () =>
      validation
        ? (text: string) => validation.analyzeBookAnalysisImport(form, text, version.language)
        : null,
    [validation, form, version.language]
  );

  /** Пробное сохранение слитой формы (решение А3): ядро, главы и ссылки — до применения импорта. */
  const previewImport = useCallback(
    async (data: SaveBookAnalysisRequest): Promise<AnalysisPreview> => {
      const body = analysisRequestFromForm(mergeAnalysisImport(form, data), version.language);
      try {
        const res = await runImportPreview({ versionId, data: body, dryRun: true });
        return { state: 'ok', check: { hasCore: res.hasCore, warnings: res.warnings } };
      } catch (error) {
        const message = errorText(error);
        // «Отвергнуты данные» — только ответ проверки (400, 422); права, лимит, пропавшая версия — сбой.
        const rejected =
          error instanceof ApiError && (error.statusCode === 400 || error.statusCode === 422);
        return rejected ? { state: 'rejected', message } : { state: 'failed', message };
      }
    },
    [form, runImportPreview, versionId, version.language]
  );

  const applyImport = (data: SaveBookAnalysisRequest) => {
    setForm((prev) => mergeAnalysisImport(prev, data));
    enqueueSnackbar('Imported into the form. Review and press «Save analysis».', {
      variant: 'info',
    });
  };

  const handleSave = () => {
    // До заполнения с сервера в форме не то, что сохранено: такая запись затёрла бы анализ.
    if (!formHydrated) return;
    if (saveBlockedReason) {
      enqueueSnackbar(saveBlockedReason, { variant: 'warning' });
      return;
    }
    if (formStale) {
      enqueueSnackbar('The analysis changed on the server: reload it before saving', {
        variant: 'warning',
      });
      return;
    }
    if (!validation) {
      enqueueSnackbar('Validation is not loaded yet', { variant: 'warning' });
      return;
    }
    // Уходит то, что сейчас написано в редакторах, а не последнее удачно проверенное значение.
    const checked = validation.revalidateListDrafts(form);
    setForm(checked);
    if (hasDraftIssues(checked)) {
      enqueueSnackbar('Fix the errors in the JSON blocks first', { variant: 'warning' });
      return;
    }
    const savedFor = versionId;
    saveMutation.mutate(
      {
        versionId,
        data: analysisRequestFromForm(checked, version.language),
        expected: formBase.current,
      },
      {
        onSuccess: (res) => {
          // Снимок — ответ сервера (его нормализованные списки), а не набранный текст: иначе
          // следующее перечитывание после хода сочло бы такие блоки правлеными. Блоки, не
          // тронутые за время сохранения, форма берёт в том же виде.
          if (res.analysis) {
            if (hydratedFor.current === savedFor) {
              formBase.current = { expectedUpdatedAt: res.analysis.updatedAt };
              setServerBlocks({});
            }
            const server = formFromAnalysis(res.analysis);
            setForm(takeServerBlocks(currentForm.current, checked, server).form);
            savedForm.current = server;
          } else {
            savedForm.current = checked;
          }
          checkSeq.current += 1;
          setSavedCheckError(null);
          setLastCheck({ hasCore: res.hasCore, warnings: res.warnings });
          enqueueSnackbar('Analysis saved', { variant: 'success' });
        },
        onError: (error) => {
          if (isServerFailure(error)) return;
          if (isRecordChanged(error)) {
            // Запись успели изменить: форма берёт чужие блоки, набранное остаётся (как после хода).
            enqueueSnackbar(
              'The analysis was changed on the server: check the fresh blocks and save again',
              { variant: 'warning' }
            );
            // Отказ по прежней версии: перечитывать нынешнюю незачем.
            if (hydratedFor.current === savedFor) void reloadBlocks();
            return;
          }
          enqueueSnackbar(error.message || 'Failed to save analysis', { variant: 'error' });
        },
      }
    );
  };

  const refetchAnalysis = analysisQuery.refetch;
  // Проба сохранённой записи на этом рендере: язык версии и мутация — свежие, без устаревшего замыкания.
  const checkSavedRef = useRef(checkSaved);
  checkSavedRef.current = checkSaved;
  /**
   * Ход «Write Analysis» записал блоки (F07-3a): анализ перечитывается, форма берёт блоки, которых
   * редактор не правил; правленые остаются, и редактор узнаёт, какие из них сервер изменил. Итог
   * прошлого сохранения больше не про эту запись — вместо него живое ядро (и проба, если его нет).
   * Форма ещё не заполнена — её заполнит свежий ответ; сменилась версия — ответ не про неё.
   */
  const reloadOnce = useCallback(async () => {
    const calledFor = versionId;
    // Не свежий ответ (отменённый или отказ) — ещё одна попытка; не вышло — форма устаревшая.
    const outcome = await refetchFresh(refetchAnalysis, { retryFailure: true });
    // Форма ещё не заполнена — её заполнит свежий ответ; сменилась версия — ответ не про неё.
    if (!outcome || hydratedFor.current !== calledFor || !savedForm.current) return;
    if (!outcome.fresh) {
      setStaleFor(calledFor);
      return;
    }
    setStaleFor(null);
    const saved = outcome.result.data ?? null;
    formBase.current = expectedRowOf(saved);
    const server = formFromAnalysis(saved);
    const merged = takeServerBlocks(currentForm.current, savedForm.current, server);
    savedForm.current = server;
    setForm(merged.form);
    // Копится между перечитываниями: у следующего `kept` пуст, если сервер больше не менялся.
    // Текст всегда свежий, блок, который форма взяла с сервера, из показа уходит.
    setServerBlocks((prev) =>
      Object.fromEntries(
        [...new Set([...Object.keys(prev), ...merged.kept])]
          .filter((k) => blockText(merged.form, k) !== blockText(server, k))
          .map((k) => [k, blockText(server, k)])
      )
    );
    checkSeq.current += 1;
    setSavedCheckError(null);
    setLastCheck(null);
    if (saved && !saved.hasCore) checkSavedRef.current(server);
    if (merged.kept.length > 0) {
      enqueueSnackbar(
        `The analysis changed on the server in blocks you are editing (the server text is shown next to them); your edits are kept: ${merged.kept.join(', ')}. Saving writes your version over it.`,
        { variant: 'warning' }
      );
    }
  }, [versionId, refetchAnalysis, enqueueSnackbar]);

  /**
   * Перечитывания идут по одному (решение арбитра `F07 | F07-3`, круг 3, Б2): параллельный refetch
   * отменял бы соседний, и тот считал бы ответ устаревшим. Вызов во время перечитывания ставит
   * ровно одно следующее (больше одного в очереди не бывает) и ждёт его.
   */
  const reloadChain = useRef<{ done: Promise<void> | null; again: boolean }>({
    done: null,
    again: false,
  });
  // Повтор зовёт перечитывание этого рендера: сменилась версия, пока шло прежнее, — следующее
  // идёт за новой, а не за прежней (её замыкание отбросило бы ответ как чужой).
  const reloadOnceRef = useRef(reloadOnce);
  reloadOnceRef.current = reloadOnce;
  const reloadBlocks = useCallback((): Promise<void> => {
    const chain = reloadChain.current;
    if (chain.done) {
      chain.again = true;
      return chain.done;
    }
    setReloading(true);
    chain.done = (async () => {
      try {
        do {
          chain.again = false;
          await reloadOnceRef.current();
        } while (chain.again);
      } finally {
        chain.done = null;
        setReloading(false);
      }
    })();
    return chain.done;
  }, []);

  const copyPromptInputs = () => {
    if (chaptersQuery.error) {
      enqueueSnackbar(`Could not load chapters: ${chaptersQuery.error.message}`, {
        variant: 'error',
      });
      return;
    }
    if (!chaptersQuery.data) {
      enqueueSnackbar('Chapters are not loaded yet', { variant: 'warning' });
      return;
    }
    // Текст собирается по нажатию: глав может быть тысячи, на каждый ввод в форме его не строим.
    const { items, pagination } = chaptersQuery.data;
    // Мотивы — только из готового и свежего досье (Р10), главы — только этой версии. Досье или
    // язык его версии ещё грузятся — как с главами, копировать рано; не загрузились или досье
    // устарело — копия без мотивов, и редактор об этом знает. Досье не готово (нет, строится,
    // упало) — мотивов нет молча. Ошибка фонового перечитывания при уже загруженных данных — не
    // отказ: данные те же.
    let withoutMotifs: string | null = null;
    if (isAdmin) {
      const dossier = dossierQuery.data;
      const dossierReady = dossier?.status === 'ready';
      if (!dossier) {
        if (dossierQuery.isError) {
          withoutMotifs = 'could not load the dossier';
        } else {
          enqueueSnackbar('The dossier motifs are not loaded yet', { variant: 'warning' });
          return;
        }
      } else if (dossierReady && dossier.fresh === false) {
        withoutMotifs = 'the dossier is outdated';
      } else if (dossierReady && foreignDossier && !dossierSourceQuery.data) {
        if (dossierSourceQuery.isError) {
          withoutMotifs = 'could not load the language of the dossier';
        } else {
          enqueueSnackbar('The dossier motifs are not loaded yet', { variant: 'warning' });
          return;
        }
      }
    }
    const motifs =
      withoutMotifs === null
        ? promptMotifsFromDossier(
            dossierQuery.data,
            items,
            pagination.total,
            foreignDossier ? dossierSourceQuery.data?.language : version.language
          )
        : null;
    const text = buildAnalysisPromptInputsText(version, items, pagination.total, motifs);
    const copied = () =>
      withoutMotifs === null
        ? enqueueSnackbar('Prompt inputs copied', { variant: 'success' })
        : enqueueSnackbar(`Prompt inputs copied without the dossier motifs: ${withoutMotifs}`, {
            variant: 'warning',
          });
    const failed = () => enqueueSnackbar('Could not copy to clipboard', { variant: 'error' });
    // Вне защищённого контекста (http) `navigator.clipboard` нет — отказ, а не исключение.
    if (!navigator.clipboard) {
      failed();
      return;
    }
    navigator.clipboard.writeText(text).then(copied, failed);
  };

  return {
    form,
    setFact,
    setText,
    setListText,
    analyzeImport,
    validationFailed,
    retryValidation: loadValidation,
    previewImport,
    applyImport,
    handleSave,
    copyPromptInputs,
    lastCheck,
    savedCheckError,
    savedCheckPending,
    // Живая запись, а не снимок формы: фоновый ответ снимок не обновляет (решение арбитра T174).
    retrySavedCheck: () => {
      if (hydratedFor.current === versionId && analysisQuery.data) {
        checkSaved(formFromAnalysis(analysisQuery.data));
      }
    },
    retryLoad: () => void analysisQuery.refetch(),
    reloadBlocks,
    /** Анализ изменился на сервере, а перечитать не удалось: «Save analysis» стоит, есть повтор. */
    formStale,
    /** Почему «Save analysis» закрыт: ход пишет блоки или идёт перечитывание; `null` — открыт. */
    saveBlockedReason,
    savedHasCore: analysisQuery.data?.hasCore ?? null,
    // Правка совпала с сервером — показывать нечего.
    serverBlocks: Object.fromEntries(
      Object.entries(serverBlocks).filter(([key, text]) => blockText(form, key) !== text)
    ),
    // Ждём ответа, в том числе запрос на паузе офлайн (`isLoading` у него ложен): полей нет,
    // пока форма не заполнена с сервера и нет ошибки чтения.
    isLoading: !formHydrated && !analysisQuery.error,
    // Ошибка чтения прячет форму только до первого заполнения: сбой фонового перечитывания
    // (фокус окна) не должен отнимать у редактора несохранённую форму и кнопку сохранения.
    loadError: formHydrated ? null : analysisQuery.error,
    isSaving: saveMutation.isPending,
  };
};
