'use client';

import { useState, type FC } from 'react';
import { Select } from 'antd';
import { useDebounce } from 'use-debounce';
import { useAuthor, useAuthors } from '@/api/hooks/useAuthors';
import type { AuthorSearchSelectProps } from './AuthorSearchSelect.types';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Author } from '@/types/api-schema';
import styles from './AuthorSearchSelect.module.scss';

/**
 * Размер страницы выдачи. Сотня осталась бы от клиентской фильтрации, где список
 * грузился целиком; отбор уехал на сервер, и в выпадающем списке сотня строк
 * не нужна — каждый добор через задержку тянул бы её вместе со счётчиками книг,
 * которые бэкенд считает на всю страницу. Тридцать — как у соседнего
 * `PersonSearchSelect`.
 */
const AUTHOR_SEARCH_PAGE_SIZE = 30;

/**
 * Значение пункта-состояния. Пункт всегда `disabled`, но значение вынесено
 * константой: скопированный без `disabled` приём отдал бы его в `onChange`,
 * `options.find` вернул бы `undefined`, и выбор молча не применился бы.
 */
const STATUS_OPTION_VALUE = '__status';

const authorName = (author: Author, lang: SupportedLang): string => {
  const translation =
    author.translations?.find((t) => t.language === lang) || author.translations?.[0];
  return translation?.name || author.slug;
};

/**
 * Выбор автора с **серверным** поиском (`LEGACY-352`).
 *
 * Клиентский фильтр по одной загруженной странице (потолок `PAGINATION_MAX_LIMIT`)
 * переставал показывать авторов за сотым, и отказ выглядел как «в базе никого
 * больше нет». Отбор поэтому идёт на сервере (`filterOption={false}`), а состояние
 * запроса читается целиком: `isFetching` показывается признаком загрузки,
 * `isError` — своим текстом. Иначе 401 на протухшей сессии схлопывает список
 * до пустого молча, и редактор заводит дубль существующего автора — ровно
 * сценарий из записи, только теперь на каждый ввод, а не раз на открытие формы.
 *
 * Уже выбранный автор мог не попасть в текущую выдачу поиска — тогда он
 * резолвится одиночным `GET /admin/authors/:id` и подмешивается в опции, иначе
 * `Select` показал бы идентификатор вместо имени. Пока автор в выдаче есть,
 * одиночный запрос не уходит вовсе.
 *
 * Форма компонента взята с соседнего `PersonSearchSelect` — та же связка
 * `filterOption={false}` + `onSearch`.
 */
export const AuthorSearchSelect: FC<AuthorSearchSelectProps> = (props) => {
  const { value, onChange, lang, extraOptions = [], placeholder, id } = props;

  const [search, setSearch] = useState('');
  // Полсекунды — как в `TagList.tsx` и `CommentsList.tsx`: без задержки запрос
  // уходил бы на каждую букву.
  const [debouncedSearch] = useDebounce(search, 500);

  const {
    data: authorsData,
    isFetching,
    isError,
  } = useAuthors({ limit: AUTHOR_SEARCH_PAGE_SIZE, search: debouncedSearch || undefined });

  const authors = authorsData?.data || [];
  const isRealAuthorId = Boolean(value) && !extraOptions.some((option) => option.value === value);
  // Отсутствующим автор считается только по **пришедшему** ответу: пока список
  // грузится, `authors` пуст, и на `!authors.some(...)` одиночное чтение уходило
  // бы вторым параллельным запросом на каждом открытии формы — ровно там, где
  // его и хотели снять.
  const selectedIsMissing =
    isRealAuthorId && Boolean(authorsData) && !authors.some((a) => a.id === value);
  const { data: selectedAuthor, isError: selectedFailed } = useAuthor(
    selectedIsMissing ? (value as string) : ''
  );

  // Закреплённый автор подмешивается, только пока поиск пуст: иначе он стоял бы
  // в результатах чужого запроса, будто нашёлся по нему. Подпись выбранного
  // значения при этом не пропадает — rc-select держит её своим кэшем.
  const options = selectedAuthor && !debouncedSearch ? [selectedAuthor, ...authors] : authors;

  /**
   * Состояние поиска показывается **отдельным пунктом списка**, а не через
   * `notFoundContent`: у формы книги есть служебные пункты («без автора»,
   * «завести вручную»), поэтому список никогда не пуст, и antd своё
   * «нет данных» не покажет вовсе. Пункт отключён — выбрать его нельзя.
   *
   * Считается по `authors`, то есть по **серверной выдаче**, а не по `options`:
   * в опции подмешан закреплённый выбранный автор, и по нему «не найдено»
   * не показалось бы никогда, а сам он стоял бы в результатах чужого запроса,
   * будто нашёлся по нему.
   */
  const statusLabel = isError
    ? 'Search failed — check the connection and try again'
    : selectedFailed
      ? 'Could not load the selected author'
      : isFetching
        ? 'Searching…'
        : authors.length === 0
          ? 'No authors found'
          : null;
  const statusOption = statusLabel
    ? { label: statusLabel, value: STATUS_OPTION_VALUE, disabled: true }
    : null;

  return (
    <Select
      showSearch
      id={id}
      className={styles.select}
      size="large"
      placeholder={placeholder}
      value={value || undefined}
      loading={isFetching}
      // Отбор на сервере: клиентский фильтр резал бы серверную выдачу второй раз.
      filterOption={false}
      // Enter без явного выбора не должен ничего выбирать. Раньше клиентский
      // `filterOption` выбрасывал служебные пункты из отфильтрованного списка,
      // и Enter попадал в первого найденного автора; при отборе на сервере
      // первой строкой остаётся «-- Select Existing Author --», а её выбор
      // чистит и `authorId`, и уже набранное вручную имя.
      defaultActiveFirstOption={false}
      onSearch={setSearch}
      // rc-select чистит свою строку поиска сам, но `onSearch` при этом не зовёт.
      // Без сброса следующее открытие списка шло бы со старым `q`, и выдача из
      // одного-двух человек читалась бы как «в базе больше никого нет».
      // `onOpenChange`, а не `onDropdownVisibleChange`: второй у antd 5.27
      // объявлен устаревшим и печатает предупреждение на каждый рендер. Когда
      // его снимут, обработчик молча перестанет срабатывать — и вернётся ровно
      // тот застрявший `q`, ради которого он здесь и стоит.
      onOpenChange={(open) => {
        if (!open) setSearch('');
      }}
      onChange={(selected: string) => {
        setSearch('');
        onChange(
          selected,
          options.find((a) => a.id === selected)
        );
      }}
      options={[
        ...extraOptions,
        ...(statusOption ? [statusOption] : []),
        ...options.map((author) => ({
          label: authorName(author, lang),
          value: author.id,
        })),
      ]}
    />
  );
};
