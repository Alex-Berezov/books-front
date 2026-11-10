/**
 * Названия этапов LLM — один словарь на всю админку: экран «LLM settings» и экраны запуска
 * перевода (окно запуска, отчёт о стоимости, пауза без провайдера, история запусков).
 *
 * Ключи — значения `stage` бэкенда: константы `*_STAGE` в `*_STAGE_DEFINITIONS`
 * (`books/src/modules/translation/<модуль>/<модуль>.constants.ts`), их регистрирует
 * `LlmStageRegistry.register`. Новый этап на бэкенде дописывается сюда же; без записи этап
 * показывается техническим именем. Значение `stage` в API не меняется — подписи только для показа.
 */
export interface LlmStageLabel {
  /** Название на экране «LLM settings» (по-русски, слово владельца `T187`). */
  title: string;
  /** Что этап делает и к какому разделу относится. */
  description: string;
  /** Имя этапа на экранах запуска перевода; нет — там показывается техническое имя. */
  runName?: string;
}

export const LLM_STAGE_LABELS: Readonly<Record<string, LlmStageLabel>> = {
  split: {
    title: 'Нарезка главы на куски',
    description: 'Перевод: ищет границы, по которым длинная глава делится на куски.',
    runName: 'Chapter split',
  },
  translate: {
    title: 'Перевод куска',
    description: 'Перевод: переводит каждый кусок главы на выбранный язык.',
    runName: 'Translation',
  },
  check_semantic: {
    title: 'Проверка смысла куска',
    description:
      'Перевод: сверяет перевод куска с оригиналом по смыслу. Модель другого семейства, чем у перевода.',
    runName: 'Meaning check',
  },
  check_language_jev: {
    title: 'Проверка языка куска',
    description: 'Перевод: быстро проверяет, что кусок написан на нужном языке.',
    runName: 'Language review',
  },
  final_check: {
    title: 'Итоговая проверка главы',
    description:
      'Перевод: читает начало и конец готовой главы рядом с оригиналом и называет ошибки по номерам блоков.',
    runName: 'Final check',
  },
  dossier: {
    title: 'Досье книги',
    description: 'Перевод: читает книгу по кускам глав и собирает досье — сюжет, героев, стиль.',
    runName: 'Dossier',
  },
  glossary: {
    title: 'Глоссарий пары языков',
    description: 'Перевод: собирает единые переводы имён и терминов для пары языков.',
    runName: 'Glossary',
  },
  metadata: {
    title: 'Название, описание и главы',
    description: 'Перевод: переводит поля версии — название, описание книги и названия глав.',
    runName: 'Version fields',
  },
  summary_section_write: {
    title: 'Пересказ: раздел',
    description: 'Пересказ: пишет один раздел пересказа по плану из досье.',
  },
  summary_full_write: {
    title: 'Пересказ: полный текст',
    description: 'Пересказ: пишет полный пересказ книги из готовых разделов.',
  },
  summary_brief_write: {
    title: 'Пересказ: краткое содержание',
    description: 'Пересказ: пишет краткое содержание книги.',
  },
  summary_review: {
    title: 'Пересказ: проверка',
    description:
      'Пересказ: проверяет написанный текст и возвращает замечания автору. Модель другого семейства, чем у автора.',
  },
  analysis_cast_write: {
    title: 'Анализ: карточка и герои',
    description: 'Анализ, шаг 1: пишет карточку книги и героев.',
  },
  analysis_quotes_write: {
    title: 'Анализ: цитаты и приёмы',
    description: 'Анализ, шаг 2: подбирает цитаты и литературные приёмы.',
  },
  analysis_meaning_write: {
    title: 'Анализ: толкования',
    description: 'Анализ, шаг 3: пишет темы, мотивы и толкования книги.',
  },
  analysis_reader_write: {
    title: 'Анализ: блоки для читателя',
    description:
      'Анализ, шаг 4: пишет блоки для читателя по итогам шагов 1–3 и кратким содержаниям глав.',
  },
  analysis_external_write: {
    title: 'Анализ: внешние блоки',
    description:
      'Анализ, шаг 5: пишет внешние блоки с проверкой источников; текст книги не читает.',
  },
  analysis_review: {
    title: 'Анализ: проверка',
    description:
      'Анализ: проверяет написанные блоки и возвращает замечания автору. Модель другого семейства, чем у автора.',
  },
};

/**
 * Имена вызовов, которые не являются этапами настроек, но приходят в отчёте запуска: кусок досье
 * идёт под этапом досье.
 */
const RUN_ALIASES: Readonly<Record<string, string>> = { dossier_part: 'dossier' };

// Свой ключ, а не прототип: этап с именем `constructor` получил бы функцию вместо подписи.
// `hasOwnProperty.call`, а не `Object.hasOwn`: цель сборки ES2020, как в `author-import.ts`.
const hasKey = (record: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

const own = (stage: string): LlmStageLabel | undefined =>
  hasKey(LLM_STAGE_LABELS, stage) ? LLM_STAGE_LABELS[stage] : undefined;

/** Есть ли у этапа своя запись в словаре (а не подпись-заглушка техническим именем). */
export const hasLlmStageLabel = (stage: string): boolean => own(stage) !== undefined;

/** Подпись для «LLM settings»; нет записи — техническое имя вместо названия, без пояснения. */
export const llmStageLabel = (stage: string): LlmStageLabel =>
  own(stage) ?? { title: stage, description: '' };

/** Имя этапа на экранах запуска; нет — техническое имя. */
export const llmStageRunName = (stage: string): string => {
  const key = hasKey(RUN_ALIASES, stage) ? RUN_ALIASES[stage] : stage;
  return own(key)?.runName ?? stage;
};
