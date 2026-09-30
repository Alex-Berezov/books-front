import { z } from 'zod';
import { isAbsoluteHttpUrl } from './http-url';

/** Поле формы с адресом: пустая строка («не задано») или абсолютный http(s). */
export const httpUrlOrEmpty = z
  .string()
  .refine((value) => value === '' || isAbsoluteHttpUrl(value), 'Must be an absolute http(s) URL');
