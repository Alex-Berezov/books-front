'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FC } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AUTHORS_SEARCH_MAX_LENGTH } from './authors-href';
import styles from './AuthorsToolbar.module.scss';

/** Задержка ввода: печатают быстрее, чем отвечает сервер. */
const SEARCH_DEBOUNCE_MS = 300;

export interface AuthorsToolbarLabels {
  searchLabel: string;
  searchPlaceholder: string;
  sortLabel: string;
  sortByName: string;
  sortByBooks: string;
}

export interface AuthorsToolbarProps {
  /** Базовый адрес страницы: хаб либо буквенная страница. Буква — часть пути. */
  basePath: string;
  search: string;
  sort: 'name' | 'books';
  labels: AuthorsToolbarLabels;
}

/**
 * Поиск и сортировка. Единственный клиентский остров хаба.
 *
 * Оба пишут в адрес, а не в состояние: `?search=` и `?sort=` можно переслать
 * ссылкой, открыть напрямую и обновить страницу. Отбор при этом остаётся
 * серверным — «загрузим всех и отфильтруем в браузере» на тысяче авторов
 * не работает, да и серверный HTML остался бы без ссылок на авторов.
 */
export const AuthorsToolbar: FC<AuthorsToolbarProps> = ({ basePath, search, sort, labels }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(search);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Последнее значение, которое отправили отсюда сами.
   *
   * 🔴 Без него синхронизация поля с адресом затирает набранное. Печатают
   * быстрее, чем отвечает сервер: набрали «толс», через 300 мс ушёл переход,
   * за время серверного рендера дописали «той» — и пришедший проп `search`
   * («толс») откатывал поле, роняя каретку в конец. Сравниваем пришедшее
   * с тем, что отправляли: совпало — это эхо нашего же перехода, поле не трогаем.
   */
  const sentTerm = useRef(search);

  /**
   * Свежие адресные данные для отложенного перехода.
   *
   * 🔴 Замыкание таймера иначе держит снимок `searchParams` и `basePath` на момент
   * нажатия клавиши. Набрали «abc», за 300 мс нажали «Больше книг» — сортировка
   * уходит в адрес, потом срабатывает взведённый таймер и пишет `?search=abc`
   * по **старому** снимку, роняя `sort=books`. То же самое рвало переход
   * по букве: `basePath` в замыкании оставался прежним.
   */
  const latest = useRef({ searchParams, basePath });
  latest.current = { searchParams, basePath };

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // Адрес сменился — не отсюда, значит переходом по букве, кнопкой «назад» или
  // ссылкой «показать всех». Отложенный переход по прежнему вводу отменяем:
  // он написал бы поверх нового адреса то, что читатель уже оставил позади.
  useEffect(() => {
    if (search === sentTerm.current) return;
    clearTimer();
    sentTerm.current = search;
    setTerm(search);
  }, [search, clearTimer]);

  // Смена пути — это переход на другую букву или на хаб. Строка поиска при этом
  // может не меняться («дост» и там, и там), поэтому эффект выше молчит, — но
  // отложенный переход всё равно обязан отмениться: он собран под прежний путь
  // и увёл бы читателя обратно.
  useEffect(() => {
    clearTimer();
  }, [basePath, clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  const pushParams = useCallback(
    (mutate: (params: URLSearchParams) => void, replace: boolean): void => {
      const { searchParams: current, basePath: path } = latest.current;
      const params = new URLSearchParams(current.toString());
      mutate(params);
      // Любая смена отбора возвращает на первую страницу: остаться на пятой
      // странице выдачи, в которой теперь две, значит показать пустоту.
      params.delete('page');

      const query = params.toString();
      const href = query ? `${path}?${query}` : path;
      // Поиск — `replace`: иначе набор имени из десяти букв оставляет в истории
      // десяток промежуточных выдач, и «назад» уводит не на предыдущую страницу,
      // а на предыдущий вариант запроса. Сортировка — осознанное действие, ей `push`.
      if (replace) router.replace(href);
      else router.push(href);
    },
    [router]
  );

  const handleSearch = (event: ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value;
    setTerm(value);

    clearTimer();

    // Снимок адреса на момент взвода таймера.
    //
    // 🔴 Эффекты выше отменяют отложенный переход, когда приезжает новый
    // серверный рендер, — но между кликом и рендером проходят те же сотни
    // миллисекунд. Нажатие на «2» в пагинации не размонтирует остров и не
    // меняет ни `search`, ни `basePath`, так что сработавший следом таймер
    // сделал бы `params.delete('page')` по прежнему снимку и вернул читателя
    // на первую страницу. Сверяемся с адресом в момент срабатывания.
    const armedQuery = latest.current.searchParams.toString();
    const armedPath = latest.current.basePath;

    timer.current = setTimeout(() => {
      const { searchParams: nowQuery, basePath: nowPath } = latest.current;
      if (nowQuery.toString() !== armedQuery || nowPath !== armedPath) return;

      const trimmed = value.trim().slice(0, AUTHORS_SEARCH_MAX_LENGTH);
      sentTerm.current = trimmed;
      pushParams((params) => {
        if (trimmed) params.set('search', trimmed);
        else params.delete('search');
      }, true);
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleSort = (next: 'name' | 'books'): void => {
    // Отложенный ввод отменяем до перехода: иначе он допишет поверх сортировки
    // свой снимок адреса и она пропадёт.
    clearTimer();
    pushParams((params) => {
      // «По алфавиту» — умолчание, и в адресе ему делать нечего: лишний
      // параметр развёл бы канонический адрес и его же копию с `?sort=name`.
      if (next === 'name') params.delete('sort');
      else params.set('sort', next);
    }, false);
  };

  return (
    <div className={styles.toolbar}>
      <label className={styles.field}>
        <span className={styles.label}>{labels.searchLabel}</span>
        <input
          className={styles.input}
          maxLength={AUTHORS_SEARCH_MAX_LENGTH}
          onChange={handleSearch}
          placeholder={labels.searchPlaceholder}
          type="search"
          value={term}
        />
      </label>

      <div aria-label={labels.sortLabel} className={styles.sort} role="group">
        <button
          aria-pressed={sort === 'name'}
          className={
            sort === 'name' ? `${styles.sortButton} ${styles.sortActive}` : styles.sortButton
          }
          onClick={() => handleSort('name')}
          type="button"
        >
          {labels.sortByName}
        </button>
        <button
          aria-pressed={sort === 'books'}
          className={
            sort === 'books' ? `${styles.sortButton} ${styles.sortActive}` : styles.sortButton
          }
          onClick={() => handleSort('books')}
          type="button"
        >
          {labels.sortByBooks}
        </button>
      </div>
    </div>
  );
};
