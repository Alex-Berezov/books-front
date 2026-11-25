import { useEffect, useState } from 'react';
import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  buttonByText,
  checkboxByLabel,
  findButtonByText,
  queryCheckboxByLabel,
} from './cheapQueries';

/**
 * Помощники заменяют поиск по роли (`T194`) и обязаны проверять то, что он проверял попутно:
 * роль, доступное имя и видимость. Без этого скрытая копия кнопки, подменённая подпись
 * или поле другого типа под той же подписью оставили бы спеки зелёными.
 */

/** Скрывает узел инлайн-стилем через DOM: `style` в разметке запрещён линтом (`LEGACY-158`). */
const hide =
  (prop: 'display' | 'visibility', value: string) =>
  (node: HTMLElement | null): void => {
    node?.style.setProperty(prop, value);
  };

describe('дешёвые поиски вместо getByRole', () => {
  it('кнопка по тексту: найдена сама кнопка, а не текст внутри неё', () => {
    render(
      <button type="button">
        <span>Start</span>
      </button>
    );
    expect(buttonByText('Start').tagName).toBe('BUTTON');
  });

  it('текст не в кнопке — отказ', () => {
    render(<p>Start</p>);
    expect(() => buttonByText('Start')).toThrow('no visible button');
  });

  it('имя кнопки сверяется целиком и по aria-label, как { name } у поиска по роли', () => {
    render(
      <>
        <button type="button">
          <span>Save</span> <span>(2)</span>
        </button>
        <button type="button" aria-label="Run">
          <span>Start</span>
        </button>
      </>
    );
    expect(() => buttonByText('Save')).toThrow('no visible button');
    expect(() => buttonByText('Start')).toThrow('no visible button');
  });

  it.each([
    [
      'aria-hidden',
      <div aria-hidden="true" key="a">
        <button type="button">Start</button>
      </div>,
    ],
    [
      'hidden',
      <div hidden key="h">
        <button type="button">Start</button>
      </div>,
    ],
    [
      'display: none',
      <div key="d" ref={hide('display', 'none')}>
        <button type="button">Start</button>
      </div>,
    ],
    [
      'visibility: hidden',
      <div key="v" ref={hide('visibility', 'hidden')}>
        <button type="button">Start</button>
      </div>,
    ],
  ])('скрытая кнопка (%s у предка) — отказ', (_, tree) => {
    render(tree);
    expect(() => buttonByText('Start')).toThrow('no visible button');
  });

  it('скрытая копия не мешает найти видимую; две видимые — отказ', () => {
    const { rerender } = render(
      <>
        <div hidden>
          <button type="button">Go on</button>
        </div>
        <button type="button">Go on</button>
      </>
    );
    expect(buttonByText('Go on')).toBeVisible();
    rerender(
      <>
        <button type="button">Go on</button>
        <button type="button">Go on</button>
      </>
    );
    expect(() => buttonByText('Go on')).toThrow('2 visible buttons');
  });

  it('ожидание длится, пока кнопка не станет видимой', async () => {
    let show: () => void = () => {};
    const Late = () => {
      const [shown, setShown] = useState(false);
      useEffect(() => {
        show = () => setShown(true);
      }, []);
      return (
        <div hidden={!shown}>
          <button type="button">Cancel the retry</button>
        </div>
      );
    };
    render(<Late />);
    let settled = false;
    const found = findButtonByText('Cancel the retry').then((el) => {
      settled = true;
      return el;
    });
    // Пока кнопка скрыта, поиск не разрешается: ждёт видимости, а не одного текста.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(settled).toBe(false);
    act(() => show());
    expect((await found).tagName).toBe('BUTTON');
  });

  it('галочка по подписи; подпись у поля другого типа — отказ в обоих поисках', () => {
    render(
      <>
        <label>
          <input type="checkbox" /> ES
        </label>
        <label>
          <input type="radio" /> EN
        </label>
      </>
    );
    expect(checkboxByLabel('ES').type).toBe('checkbox');
    expect(() => checkboxByLabel('EN')).toThrow('no visible checkbox');
    expect(() => queryCheckboxByLabel('EN')).toThrow('not a checkbox');
    expect(queryCheckboxByLabel('ES')).not.toBeNull();
    expect(queryCheckboxByLabel('FR')).toBeNull();
  });

  it('скрытая галочка — не найдена ни одним поиском', () => {
    render(
      <div aria-hidden="true">
        <label>
          <input type="checkbox" /> ES
        </label>
      </div>
    );
    expect(() => checkboxByLabel('ES')).toThrow('no visible checkbox');
    expect(queryCheckboxByLabel('ES')).toBeNull();
  });
});
