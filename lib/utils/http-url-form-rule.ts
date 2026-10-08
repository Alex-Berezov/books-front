import { isAbsoluteHttpUrl } from './http-url';

/**
 * Правила полей ссылок для форм antd админки: тот же `IsAbsoluteHttpUrl`, что на бэкенде
 * (`LEGACY-447`). Без них ссылка без схемы (`example.org/a`), которую ручка раньше принимала,
 * уходит на сервер и возвращается 400 общей ошибкой — форма называет поле до запроса.
 *
 * Объект правила без импорта `antd`: файл живёт в `lib/` и годится любой форме.
 */

const MESSAGE = 'Нужна абсолютная ссылка http(s)://…';

/** Одна ссылка; пустое поле не проверяется — форма шлёт его как отсутствующее. */
export const httpUrlFormRule = {
  validator: (_rule: unknown, value: unknown): Promise<void> => {
    if (typeof value !== 'string' || value.trim() === '') return Promise.resolve();
    return isAbsoluteHttpUrl(value.trim()) ? Promise.resolve() : Promise.reject(new Error(MESSAGE));
  },
};

/**
 * Список ссылок в одном поле — по одной в строке или через пробел. Запятая не разделитель:
 * она законна внутри адреса (`/wiki/Уайльд,_Оскар`). Тот же разбор уходит в тело запроса,
 * чтобы правило и запрос видели одни и те же ссылки.
 */
export function splitUrlList(value: unknown): string[] | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  return value.split(/\s+/).filter(Boolean);
}

export const httpUrlListFormRule = {
  validator: (_rule: unknown, value: unknown): Promise<void> => {
    const bad = splitUrlList(value)?.find((item) => !isAbsoluteHttpUrl(item));
    return bad ? Promise.reject(new Error(`${MESSAGE}: ${bad}`)) : Promise.resolve();
  },
};
