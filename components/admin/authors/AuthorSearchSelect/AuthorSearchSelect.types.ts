import type { SupportedLang } from '@/lib/i18n/lang';
import type { Author } from '@/types/api-schema';

export interface AuthorSearchSelectOption {
  label: string;
  value: string;
}

export interface AuthorSearchSelectProps {
  /** Идентификатор выбранного автора либо значение служебной опции. */
  value?: string;
  onChange: (value: string, author?: Author) => void;
  /** Язык, на котором показывать имя автора; запасной — первый перевод. */
  lang: SupportedLang;
  /** Служебные пункты формы («без автора», «завести вручную») — они не автор. */
  extraOptions?: AuthorSearchSelectOption[];
  placeholder?: string;
  id?: string;
}
