import type { SupportedLang } from '@/lib/i18n/lang';

export interface EditorialBylineProps {
  lang: SupportedLang;
  /** Текст перед именем редакции, вместе с пробелом: «Описание подготовлено ». */
  prefix?: string;
  /** Имя редакции - ссылка на `/editorial-policy#who`. */
  teamLabel: string;
  /** Уже отформатированная подпись даты («Обновлено 13 октября 2026 г.»); без неё даты нет. */
  dateText?: string;
}
