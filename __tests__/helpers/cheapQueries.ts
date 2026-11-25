import { isInaccessible, screen, waitFor } from '@testing-library/react';

/**
 * Дешёвые замены `getByRole(role, { name })` для тяжёлых деревьев antd (`T194`).
 *
 * Поиск по роли с именем вычисляет роль и доступное имя каждого элемента дерева: в окне запуска
 * перевода один тест шёл 13,4 с без нагрузки при пороге 15 с и падал под параллельным прогоном.
 * `hidden: true` и сужение до контейнера не помогают — цена в самом переборе, а контейнер окна
 * и карточки и есть всё дерево. Здесь элемент ищется по тексту или подписи, а то, что поиск
 * по роли проверял попутно, проверяется у найденных кандидатов: что элемент — `<button>` или
 * `<input type="checkbox">`, имя (см. `nameOf`) и видимость. Атрибут `role` на элементе
 * не сверяется: кнопка с `role="switch"` пройдёт, где поиск по роли отказал бы.
 *
 * Одна копия на все спеки: вторая разойдётся с первой проверками (прецедент — `xhrStub.ts`).
 */

/**
 * Имя кнопки без перебора дерева: `aria-label`, иначе её текст целиком. Сверка ловит
 * подменённую `aria-label` подпись и лишний текст в кнопке. Это не полный расчёт доступного
 * имени, как у `{ name }` поиска по роли: `aria-labelledby` и `title` не учитываются.
 */
const nameOf = (el: Element): string =>
  (el.getAttribute('aria-label') ?? el.textContent ?? '').replace(/\s+/g, ' ').trim();

/**
 * Видимость проверяется тем же `isInaccessible`, что у поиска по роли (`aria-hidden`, `hidden`,
 * `display: none`, `visibility: hidden`, в том числе от стилей antd), но только у найденных
 * кандидатов, а не у каждого элемента дерева: в переборе и была цена.
 */
const PLURAL = { button: 'buttons', checkbox: 'checkboxes' } as const;

const pick = <T extends Element>(what: 'button' | 'checkbox', name: string, found: T[]): T => {
  const shown = found.filter((el) => !isInaccessible(el));
  if (shown.length === 0) throw new Error(`no visible ${what} «${name}»`);
  if (shown.length > 1) throw new Error(`${shown.length} visible ${PLURAL[what]} «${name}»`);
  return shown[0];
};

const buttonsWithText = (name: string): HTMLButtonElement[] =>
  screen
    .queryAllByText(name)
    .map((node) => node.closest('button'))
    .filter((el): el is HTMLButtonElement => el !== null && nameOf(el) === name)
    .filter((el, i, all) => all.indexOf(el) === i);

/** Единственная видимая кнопка с именем `name`; вместо `getByRole('button', { name })`. */
export const buttonByText = (name: string): HTMLButtonElement =>
  pick('button', name, buttonsWithText(name));

/** То же с ожиданием, пока кнопка не станет видимой; вместо `findByRole('button', { name })`. */
export const findButtonByText = (name: string): Promise<HTMLButtonElement> =>
  waitFor(() => buttonByText(name));

const checkboxesWithLabel = (label: string): HTMLInputElement[] =>
  screen
    .queryAllByLabelText(label)
    .filter(
      (el): el is HTMLInputElement => el instanceof HTMLInputElement && el.type === 'checkbox'
    );

/** Единственная видимая галочка с подписью `label`; вместо `getByRole('checkbox', { name })`. */
export const checkboxByLabel = (label: string): HTMLInputElement =>
  pick('checkbox', label, checkboxesWithLabel(label));

/**
 * Видимой галочки с подписью `label` нет; вместо `queryByRole('checkbox', { name })`. Подпись
 * у поля другого типа — отказ, а не `null`: иначе «язык не предлагается» прошло бы и тогда,
 * когда язык предложен переключателем или радиокнопкой.
 */
export const queryCheckboxByLabel = (label: string): HTMLInputElement | null => {
  const other = screen
    .queryAllByLabelText(label)
    .filter((el) => !(el instanceof HTMLInputElement && el.type === 'checkbox'));
  if (other.length > 0) throw new Error(`«${label}» labels a control that is not a checkbox`);
  const shown = checkboxesWithLabel(label).filter((el) => !isInaccessible(el));
  if (shown.length === 0) return null;
  return pick('checkbox', label, shown);
};
