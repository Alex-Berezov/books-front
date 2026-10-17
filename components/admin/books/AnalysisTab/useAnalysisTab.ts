import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSnackbar } from 'notistack';
import { useBookAnalysis, useChapterTitles, useSaveBookAnalysis } from '@/api/hooks';
import {
  analysisRequestFromForm,
  formFromAnalysis,
  hasDraftIssues,
  mergeAnalysisImport,
  UNCHECKED_DRAFT_ISSUE,
  type BookAnalysisFormValues,
} from '@/lib/admin/book-analysis-form-state';
import { buildAnalysisPromptInputsText } from '@/lib/admin/book-analysis-prompt-inputs';
import {
  loadBookAnalysisValidation,
  type BookAnalysisValidation,
} from '@/lib/admin/load-book-analysis-validation';
import { ApiError } from '@/types/api';
import type { AnalysisPreview, AnalysisServerCheck, AnalysisTabProps } from './AnalysisTab.types';
import type {
  BookAnalysisFactKey,
  BookAnalysisListKey,
  BookAnalysisTextKey,
} from '@/lib/admin/book-analysis-blocks';
import type { SaveBookAnalysisRequest } from '@/types/api-schema';

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
  const { versionId, version } = props;
  const { enqueueSnackbar } = useSnackbar();

  const analysisQuery = useBookAnalysis(versionId);
  const chaptersQuery = useChapterTitles(versionId);
  const saveMutation = useSaveBookAnalysis();
  // Отдельная мутация для пробы: её ожидание не должно выглядеть сохранением.
  const { mutateAsync: runPreview } = useSaveBookAnalysis();

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
  // Снимок формы сохранённой записи: повтор пробы проверяет её, а не несохранённые правки.
  const savedForm = useRef<BookAnalysisFormValues | null>(null);
  useEffect(() => {
    // Пока идёт перечитывание, кэш может быть устаревшим (вкладку смонтировали заново позже
    // `staleTime`): заполнять форму только свежими данными, иначе сохранение всей записи вернёт
    // блоки, сохранённые другим редактором.
    if (!analysisQuery.isSuccess || analysisQuery.isFetching || hydratedFor.current === versionId) {
      return;
    }
    hydratedFor.current = versionId;
    // Проба прошлой версии (тот же хук при смене версии) не должна лечь на эту.
    checkSeq.current += 1;
    setSavedCheckError(null);
    const saved = analysisQuery.data ?? null;
    const hydrated = formFromAnalysis(saved);
    savedForm.current = hydrated;
    setForm(hydrated);
    setLastCheck(null);
    // Сохранённый анализ без ядра: сразу показать, чего не хватает (§2), — той же пробой сервера.
    if (saved && !saved.hasCore) checkSaved(hydrated);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- гидрация один раз на версию; checkSaved читает только аргумент и стабильные ссылки
  }, [analysisQuery.data, analysisQuery.isSuccess, analysisQuery.isFetching, versionId]);

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
        const res = await runPreview({ versionId, data: body, dryRun: true });
        return { state: 'ok', check: { hasCore: res.hasCore, warnings: res.warnings } };
      } catch (error) {
        const message = errorText(error);
        // «Отвергнуты данные» — только ответ проверки (400, 422); права, лимит, пропавшая версия — сбой.
        const rejected =
          error instanceof ApiError && (error.statusCode === 400 || error.statusCode === 422);
        return rejected ? { state: 'rejected', message } : { state: 'failed', message };
      }
    },
    [form, runPreview, versionId, version.language]
  );

  const applyImport = (data: SaveBookAnalysisRequest) => {
    setForm((prev) => mergeAnalysisImport(prev, data));
    enqueueSnackbar('Imported into the form. Review and press «Save analysis».', {
      variant: 'info',
    });
  };

  const handleSave = () => {
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
    saveMutation.mutate(
      { versionId, data: analysisRequestFromForm(checked, version.language) },
      {
        onSuccess: (res) => {
          savedForm.current = checked;
          checkSeq.current += 1;
          setSavedCheckError(null);
          setLastCheck({ hasCore: res.hasCore, warnings: res.warnings });
          enqueueSnackbar('Analysis saved', { variant: 'success' });
        },
        onError: (error) => {
          if (isServerFailure(error)) return;
          enqueueSnackbar(error.message || 'Failed to save analysis', { variant: 'error' });
        },
      }
    );
  };

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
    const text = buildAnalysisPromptInputsText(version, items, pagination.total);
    const failed = () => enqueueSnackbar('Could not copy to clipboard', { variant: 'error' });
    // Вне защищённого контекста (http) `navigator.clipboard` нет — отказ, а не исключение.
    if (!navigator.clipboard) {
      failed();
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => enqueueSnackbar('Prompt inputs copied', { variant: 'success' }), failed);
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
    retrySavedCheck: () => {
      if (savedForm.current) checkSaved(savedForm.current);
    },
    retryLoad: () => void analysisQuery.refetch(),
    savedHasCore: analysisQuery.data?.hasCore ?? null,
    isLoading: analysisQuery.isLoading,
    // Ошибка чтения прячет форму только до первого заполнения: сбой фонового перечитывания
    // (фокус окна) не должен отнимать у редактора несохранённую форму и кнопку сохранения.
    loadError: hydratedFor.current === versionId ? null : analysisQuery.error,
    isSaving: saveMutation.isPending,
  };
};
