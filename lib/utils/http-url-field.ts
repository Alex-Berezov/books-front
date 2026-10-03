import { z } from 'zod';
import { isAbsoluteHttpUrl, isAbsoluteHttpUrlOrRootPath } from './http-url';

/** Поле формы с адресом: пустая строка («не задано») или абсолютный http(s). */
export const httpUrlOrEmpty = z
  .string()
  .refine((value) => value === '' || isAbsoluteHttpUrl(value), 'Must be an absolute http(s) URL');

/** То же для поля, которое законно хранит и внутренний путь от корня (`authorPageUrl`). */
export const httpUrlOrRootPathOrEmpty = z
  .string()
  .refine(
    (value) => value === '' || isAbsoluteHttpUrlOrRootPath(value),
    'Must be an absolute http(s) URL or a path starting with "/"'
  );
